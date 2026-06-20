function resolveGroupAction(mouseX, mouseY, clickedUnit) {
    const action = state.groupAction;
    const eligible = state.selectedUnits.filter(u => !u.hasActedThisPhase);
    if (eligible.length === 0) { state.groupAction = null; updateGroupUI(); return; }
    if (action === 'move' || action === 'charge') {
        if (clickedUnit) { state.groupAction = null; updateGroupUI(); return; }
        const placed = [];
        const collidesPlaced = (x, y, r, excludeUnit) => {
            for (const o of state.units) { if (o === excludeUnit || state.selectedUnits.includes(o)) continue; if (Math.sqrt((x-o.x)**2+(y-o.y)**2) < r+o.radius) return true; }
            for (const p of placed) { if (Math.sqrt((x-p.x)**2+(y-p.y)**2) < r+p.r) return true; }
            return false;
        };
        eligible.forEach(u => {
            const dx=mouseX-u.x, dy=mouseY-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            const range = action === 'charge' ? u.chargeDist : u.m;
            if (dist > range) return;
            if (action === 'charge' && !state.units.some(en => en.team !== state.turn && Math.sqrt((mouseX-en.x)**2+(mouseY-en.y)**2) <= u.radius+en.radius+20)) return;
            let tx=mouseX, ty=mouseY;
            if (collidesPlaced(tx, ty, u.radius, u)) {
                let found = false;
                for (let ring=1; ring<=8&&!found; ring++) { const ringR=ring*u.radius*2.2; for (let a=0; a<Math.PI*2&&!found; a+=Math.PI/4) { const nx=mouseX+Math.cos(a)*ringR, ny=mouseY+Math.sin(a)*ringR; if (Math.sqrt((nx-u.x)**2+(ny-u.y)**2)<=range&&!collidesPlaced(nx,ny,u.radius,u)) { tx=nx; ty=ny; found=true; } } }
                if (!found) return;
            }
            placed.push({x:tx,y:ty,r:u.radius}); u.targetX=tx; u.targetY=ty; u.isMoving=true; u.hasActedThisPhase=true;
        });
        state.groupAction = null; updateGroupUI(); onlineSync();
    } else if (action === 'shoot' || action === 'melee') {
        if (!clickedUnit || clickedUnit.team === state.turn) { state.groupAction = null; updateGroupUI(); return; }
        const isMelee = action === 'melee';
        const shooters = isMelee ? eligible : eligible.filter(u => { const dx=clickedUnit.x-u.x, dy=clickedUnit.y-u.y; return Math.sqrt(dx*dx+dy*dy)<=u.rangedWeapon.range && checkLineOfSight(u.x,u.y,clickedUnit.x,clickedUnit.y); });
        if (shooters.length === 0) { state.groupAction = null; updateGroupUI(); return; }
        startGroupCombat(shooters, clickedUnit, isMelee);
    }
}

canvas.addEventListener('mousedown', e => {
    isMouseDown=true; dragStartX=e.clientX; dragStartY=e.clientY; isDragging=false;
    const rect=canvas.getBoundingClientRect(), worldX=(e.clientX-rect.left-state.camera.x)/state.scale, worldY=(e.clientY-rect.top-state.camera.y)/state.scale;
    clickedOnUnitAtStart=null; for (const unit of state.units) { const dx=worldX-unit.x, dy=worldY-unit.y; if (Math.sqrt(dx*dx+dy*dy)<=unit.radius+5) { clickedOnUnitAtStart=unit; break; } }
    if (e.button===1||e.button===2) { isPanning=true; panStartX=e.clientX-state.camera.x; panStartY=e.clientY-state.camera.y; }
    if (e.ctrlKey&&e.button===0&&!clickedOnUnitAtStart) { isRubberBanding=true; rubberX1=e.clientX; rubberY1=e.clientY; rubberX2=e.clientX; rubberY2=e.clientY; }
});

canvas.addEventListener('mouseup', e => {
    isMouseDown=false;
    if (isRubberBanding) {
        isRubberBanding=false; isPanning=false; isDragging=false;
        const rect=canvas.getBoundingClientRect();
        const wx1=(Math.min(rubberX1,rubberX2)-rect.left-state.camera.x)/state.scale, wy1=(Math.min(rubberY1,rubberY2)-rect.top-state.camera.y)/state.scale;
        const wx2=(Math.max(rubberX1,rubberX2)-rect.left-state.camera.x)/state.scale, wy2=(Math.max(rubberY1,rubberY2)-rect.top-state.camera.y)/state.scale;
        const inRect=state.units.filter(u=>u.team===state.turn&&u.x>=wx1&&u.x<=wx2&&u.y>=wy1&&u.y<=wy2);
        if (inRect.length>=2) { state.selectedUnits=inRect; state.selectedUnit=null; state.currentAction=null; updateGroupUI(); }
        return;
    }
    isPanning=false;
    if (state.winner) return;
    if (isDragging&&!state.currentAction&&!state.groupAction) { isDragging=false; return; }
    isDragging=false;
    const rect=canvas.getBoundingClientRect();
    const mouseX=(e.clientX-rect.left-state.camera.x)/state.scale, mouseY=(e.clientY-rect.top-state.camera.y)/state.scale;
    let clickedUnit=null; for (const unit of state.units) { const dx=mouseX-unit.x, dy=mouseY-unit.y; if (Math.sqrt(dx*dx+dy*dy)<=unit.radius+5) { clickedUnit=unit; break; } }
    if (e.ctrlKey) {
        if (clickedUnit&&clickedUnit.team===state.turn) {
            const idx=state.selectedUnits.indexOf(clickedUnit);
            if (idx>=0) state.selectedUnits.splice(idx,1); else state.selectedUnits.push(clickedUnit);
            state.selectedUnit=null; state.currentAction=null; document.getElementById('abilityPopup').classList.add('hidden'); updateGroupUI();
        }
        return;
    }
    if (state.selectedUnits.length>=2&&state.groupAction) { resolveGroupAction(mouseX,mouseY,clickedUnit); return; }
    if (state.selectedUnits.length>0) { state.selectedUnits=[]; state.groupAction=null; updateGroupUI(); }
    if (state.selectedUnit&&state.currentAction&&!state.selectedUnit.hasActedThisPhase&&!state.selectedUnit.isMoving) {
        if (state.currentAction==='move') {
            const dx=mouseX-state.selectedUnit.x, dy=mouseY-state.selectedUnit.y, dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<=state.selectedUnit.m&&!clickedUnit&&mouseX>=0&&mouseX<=MAP_WIDTH&&mouseY>=0&&mouseY<=MAP_HEIGHT) {
                if (checkCollision(mouseX,mouseY,state.selectedUnit)) { if (!checkTerrainCollision(state.selectedUnit.x,state.selectedUnit.y,mouseX,mouseY)) { state.selectedUnit.targetX=mouseX; state.selectedUnit.targetY=mouseY; state.selectedUnit.isMoving=true; state.selectedUnit.hasActedThisPhase=true; state.currentAction=null; onlineSync(); } else alert('Path blocked by terrain.'); } else alert('Path blocked by another unit.');
            } else if (!clickedUnit) { state.selectedUnit=null; state.currentAction=null; }
            updateUI(); return;
        }
        if (state.currentAction==='charge') {
            const dx=mouseX-state.selectedUnit.x, dy=mouseY-state.selectedUnit.y, dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<=state.selectedUnit.chargeDist&&!clickedUnit&&mouseX>=0&&mouseX<=MAP_WIDTH&&mouseY>=0&&mouseY<=MAP_HEIGHT) {
                let validCharge=false; for (const u of state.units) { if (u.team!==state.turn) { const ex=mouseX-u.x, ey=mouseY-u.y; if (Math.sqrt(ex*ex+ey*ey)<=state.selectedUnit.radius+u.radius+15) { validCharge=true; break; } } }
                if (validCharge&&checkCollision(mouseX,mouseY,state.selectedUnit)) { if (!checkTerrainCollision(state.selectedUnit.x,state.selectedUnit.y,mouseX,mouseY)) { state.selectedUnit.targetX=mouseX; state.selectedUnit.targetY=mouseY; state.selectedUnit.isMoving=true; state.selectedUnit.hasActedThisPhase=true; state.currentAction=null; onlineSync(); } else alert('Charge path blocked by terrain.'); }
                else if (!validCharge) alert('Must end charge move near an enemy!'); else alert('Path blocked by another unit.');
            } else if (!clickedUnit) { state.selectedUnit=null; state.currentAction=null; }
            updateUI(); return;
        }
        if (state.currentAction==='shoot') {
            if (clickedUnit&&clickedUnit.team!==state.turn) {
                const dx=clickedUnit.x-state.selectedUnit.x, dy=clickedUnit.y-state.selectedUnit.y, dist=Math.sqrt(dx*dx+dy*dy);
                if (dist>state.selectedUnit.rangedWeapon.range) alert('Target out of range.');
                else if (!checkLineOfSight(state.selectedUnit.x,state.selectedUnit.y,clickedUnit.x,clickedUnit.y)) alert('No line of sight.');
                else startCombat(state.selectedUnit,clickedUnit,false);
            } else if (!clickedUnit) { state.selectedUnit=null; state.currentAction=null; }
            updateUI(); return;
        }
        if (state.currentAction==='melee') { if (clickedUnit&&clickedUnit.team!==state.turn) startCombat(state.selectedUnit,clickedUnit,true); else if (!clickedUnit) { state.selectedUnit=null; state.currentAction=null; } updateUI(); return; }
    }
    if (clickedUnit) {
        if (clickedUnit.team===state.turn) {
            state.selectedUnit=clickedUnit; state.currentAction=null; document.getElementById('abilityPopup').classList.add('hidden');
            if (!state.selectedUnit.hasActedThisPhase) { const ph=state.phases[state.currentPhaseIndex]; if (ph==='Movement') state.currentAction='move'; else if (ph==='Shooting') state.currentAction='shoot'; else if (ph==='Charge') state.currentAction='charge'; else if (ph==='Fight') state.currentAction='melee'; }
        }
    } else { state.selectedUnit=null; state.currentAction=null; document.getElementById('abilityPopup').classList.add('hidden'); }
    updateUI();
});

canvas.addEventListener('mousemove', e => {
    if (isMouseDown) { if (Math.abs(e.clientX-dragStartX)>5||Math.abs(e.clientY-dragStartY)>5) { isDragging=true; if (!isPanning&&!clickedOnUnitAtStart&&!state.currentAction&&!e.ctrlKey) { isPanning=true; panStartX=e.clientX-state.camera.x; panStartY=e.clientY-state.camera.y; } } }
    if (isPanning) { state.camera.x=e.clientX-panStartX; state.camera.y=e.clientY-panStartY; constrainCamera(); }
    if (isRubberBanding) { rubberX2=e.clientX; rubberY2=e.clientY; }
    const rect=canvas.getBoundingClientRect(); mousePos.x=(e.clientX-rect.left-state.camera.x)/state.scale; mousePos.y=(e.clientY-rect.top-state.camera.y)/state.scale;
    if (!isRubberBanding) {
        let hoveredEnemy=null; for (const unit of state.units) { if (unit.team!==state.turn) { const dx=mousePos.x-unit.x, dy=mousePos.y-unit.y; if (Math.sqrt(dx*dx+dy*dy)<=unit.radius+5) { hoveredEnemy=unit; break; } } }
        if (hoveredEnemy) showEnemyTooltip(hoveredEnemy, e.clientX, e.clientY); else hideEnemyTooltip();
    }
});

canvas.addEventListener('mouseleave', () => hideEnemyTooltip());
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomAmount=e.deltaY*-0.001, cx=canvas.width/2, cy=canvas.height/2;
    const worldX=(cx-state.camera.x)/state.scale, worldY=(cy-state.camera.y)/state.scale;
    state.scale+=zoomAmount; constrainCamera();
    state.camera.x=cx-worldX*state.scale; state.camera.y=cy-worldY*state.scale; constrainCamera();
});
