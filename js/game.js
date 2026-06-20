const canvas = document.getElementById('gameCanvas'), ctx = canvas.getContext('2d');
canvas.addEventListener('contextmenu', e => e.preventDefault());

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; constrainCamera(); }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

function constrainCamera() {
    if (!canvas.width || !canvas.height) return;
    const minSX = canvas.width / MAP_WIDTH, minSY = canvas.height / MAP_HEIGHT, minS = Math.max(minSX, minSY);
    if (state.scale < minS) state.scale = minS; if (state.scale > 4.0) state.scale = 4.0;
    const minX = canvas.width - MAP_WIDTH * state.scale, minY = canvas.height - MAP_HEIGHT * state.scale;
    if (minX > 0) state.camera.x = minX / 2; else { if (state.camera.x > 0) state.camera.x = 0; if (state.camera.x < minX) state.camera.x = minX; }
    if (minY > 0) state.camera.y = minY / 2; else { if (state.camera.y > 0) state.camera.y = 0; if (state.camera.y < minY) state.camera.y = minY; }
}

function rollD6() { return Math.floor(Math.random() * 6) + 1; }
function getToWound(s, t) { if (s >= t * 2) return 2; if (s > t) return 3; if (s === t) return 4; if (s <= t / 2) return 6; if (s < t) return 5; return 4; }

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d1x = x2-x1, d1y = y2-y1, d2x = x4-x3, d2y = y4-y3, cross = d1x*d2y - d1y*d2x;
    if (cross === 0) return false;
    const t = ((x3-x1)*d2y - (y3-y1)*d2x) / cross, u = ((x3-x1)*d1y - (y3-y1)*d1x) / cross;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    if (rw < 0) { rx += rw; rw = -rw; } if (rh < 0) { ry += rh; rh = -rh; }
    const l = rx, r = rx+rw, top = ry, bot = ry+rh;
    if (x1>=l && x1<=r && y1>=top && y1<=bot) return true;
    if (x2>=l && x2<=r && y2>=top && y2<=bot) return true;
    return segmentsIntersect(x1,y1,x2,y2,l,top,r,top) || segmentsIntersect(x1,y1,x2,y2,r,top,r,bot) || segmentsIntersect(x1,y1,x2,y2,r,bot,l,bot) || segmentsIntersect(x1,y1,x2,y2,l,bot,l,top);
}
function checkTerrainCollision(sx, sy, ex, ey) { for (const t of state.terrain) if (lineIntersectsRect(sx, sy, ex, ey, t.x, t.y, t.w, t.h)) return true; return false; }
function checkLineOfSight(x1, y1, x2, y2) { for (const t of state.terrain) if (lineIntersectsRect(x1, y1, x2, y2, t.x, t.y, t.w, t.h)) return false; return true; }
function checkCollision(tx, ty, movingUnit) { for (const u of state.units) if (u !== movingUnit) { const dx = tx-u.x, dy = ty-u.y; if (Math.sqrt(dx*dx+dy*dy) < movingUnit.radius+u.radius) return false; } return true; }
function checkDeath(unit) { if (unit.hp <= 0) { state.units = state.units.filter(u => u !== unit); if (state.selectedUnit === unit) state.selectedUnit = null; state.selectedUnits = state.selectedUnits.filter(u => u !== unit); checkWinCondition(); } }
function checkWinCondition() { const t1 = state.units.some(u => u.team === 1), t2 = state.units.some(u => u.team === 2); if (!t1) state.winner = 2; else if (!t2) state.winner = 1; }

function addLRuin(x, y, size) { const t = 20; state.terrain.push(new TerrainRect(x, y, size, t)); state.terrain.push(new TerrainRect(x, y, t, size)); }

function buildTerrain(preset) {
    const cx = MAP_WIDTH / 2, cy = MAP_HEIGHT / 2;
    if (preset === 0) {
        // Ruined Outpost — symmetric L-ruins + side walls
        addLRuin(cx-100, cy-100, 200); addLRuin(cx+100, cy+100, -200);
        state.terrain.push(new TerrainRect(200, cy-150, 25, 300)); state.terrain.push(new TerrainRect(MAP_WIDTH-225, cy-150, 25, 300));
        addLRuin(150, 150, 100); addLRuin(MAP_WIDTH-150, 150, -100); addLRuin(150, MAP_HEIGHT-150, 100); addLRuin(MAP_WIDTH-150, MAP_HEIGHT-150, -100);
    } else if (preset === 1) {
        // Crossroads — 4 quadrant bunkers + cross-wall gaps
        addLRuin(cx-280, cy-200, 110); addLRuin(cx+170, cy-200, -110);
        addLRuin(cx-280, cy+90,  110); addLRuin(cx+170, cy+90,  -110);
        state.terrain.push(new TerrainRect(cx-130, cy-15, 100, 30)); state.terrain.push(new TerrainRect(cx+30, cy-15, 100, 30));
        state.terrain.push(new TerrainRect(cx-15, cy-130, 30, 100)); state.terrain.push(new TerrainRect(cx-15, cy+30, 30, 100));
        state.terrain.push(new TerrainRect(110, cy-50, 20, 100)); state.terrain.push(new TerrainRect(MAP_WIDTH-130, cy-50, 20, 100));
    } else {
        // Scattered Rubble — small obstacles spread across field
        const blocks = [
            [cx-60, cy-130, 120, 22], [cx-60, cy+108, 120, 22],
            [cx-200, cy-22, 80, 22],  [cx+120, cy-22, 80, 22],
            [280,  cy-160, 22, 90],   [280,  cy+70,  22, 90],
            [MAP_WIDTH-302, cy-160, 22, 90], [MAP_WIDTH-302, cy+70, 22, 90],
            [cx-130, 170, 22, 80],    [cx+108, 170, 22, 80],
            [cx-130, MAP_HEIGHT-250, 22, 80], [cx+108, MAP_HEIGHT-250, 22, 80],
            [130, cy-20, 70, 20],     [MAP_WIDTH-200, cy-20, 70, 20],
        ];
        for (const [x,y,w,h] of blocks) state.terrain.push(new TerrainRect(x, y, w, h));
    }
}

function initGame() {
    state.units = []; state.terrain = []; state.round = 1; state.turn = 1; state.currentPhaseIndex = 0;
    state.selectedUnit = null; state.currentAction = null; state.winner = null; state.scale = 1.0;
    state.camera = { x: 0, y: 0 }; state.selectedUnits = []; state.groupAction = null;
    state.combatQueue = []; state.cp = { 1: 1, 2: 1 };
    document.getElementById('groupPanel').classList.add('hidden');

    buildTerrain(Math.floor(Math.random() * 3));

    const p1Units = spawnTeam(1, teamData.p1), p2Units = spawnTeam(2, teamData.p2);
    const p1Pos = layoutGroupedPositions(p1Units, 1), p2Pos = layoutGroupedPositions(p2Units, 2);
    p1Units.forEach((e, i) => state.units.push(new Unit(1, e.def, e.name, p1Pos[i].x, p1Pos[i].y)));
    p2Units.forEach((e, i) => state.units.push(new Unit(2, e.def, e.name, p2Pos[i].x, p2Pos[i].y)));
    state.units.forEach((u, i) => { u.uid = i; });

    document.querySelector('.p1-faction').innerText = teamData.p1.faction;
    document.querySelector('.p2-faction').innerText = teamData.p2.faction;
    constrainCamera(); updateUI();
}

function addEffect(type, x, y, tx, ty) { state.effects.push({ type, x, y, tx, ty, life: 1.0 }); }

function draw() {
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.translate(state.camera.x, state.camera.y); ctx.scale(state.scale, state.scale);
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,MAP_WIDTH,MAP_HEIGHT);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4/state.scale; ctx.strokeRect(0,0,MAP_WIDTH,MAP_HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1/state.scale;
    for (let i=0; i<=MAP_WIDTH; i+=50) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,MAP_HEIGHT); ctx.stroke(); }
    for (let i=0; i<=MAP_HEIGHT; i+=50) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(MAP_WIDTH,i); ctx.stroke(); }
    for (const t of state.terrain) t.draw(ctx);

    if (state.selectedUnit && !state.winner) {
        const u = state.selectedUnit;
        if (state.currentAction === 'move' && !u.hasActedThisPhase) {
            ctx.beginPath(); ctx.arc(u.x,u.y,u.m,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1/state.scale; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
            const dx=mousePos.x-u.x, dy=mousePos.y-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<=u.m) {
                const b=checkTerrainCollision(u.x,u.y,mousePos.x,mousePos.y)||!checkCollision(mousePos.x,mousePos.y,u)||mousePos.x<0||mousePos.x>MAP_WIDTH||mousePos.y<0||mousePos.y>MAP_HEIGHT;
                ctx.beginPath(); ctx.moveTo(u.x,u.y); ctx.lineTo(mousePos.x,mousePos.y); ctx.strokeStyle=b?'rgba(255,0,0,0.8)':'rgba(255,255,255,0.8)'; ctx.lineWidth=2/state.scale; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(mousePos.x,mousePos.y,u.radius,0,Math.PI*2); ctx.fillStyle=b?'rgba(255,0,0,0.5)':u.color+'80'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1/state.scale; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);
            }
        } else if (state.currentAction === 'shoot' && !u.hasActedThisPhase) {
            ctx.beginPath(); ctx.arc(u.x,u.y,u.rangedWeapon.range,0,Math.PI*2); ctx.fillStyle='rgba(255,0,0,0.05)'; ctx.fill();
            ctx.strokeStyle='rgba(255,0,0,0.3)'; ctx.lineWidth=1/state.scale; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
            const dx=mousePos.x-u.x, dy=mousePos.y-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<=u.rangedWeapon.range) {
                let th=null; for (const e of state.units) { if (e.team!==state.turn) { const ex=mousePos.x-e.x, ey=mousePos.y-e.y; if (Math.sqrt(ex*ex+ey*ey)<=e.radius+5) { th=e; break; } } }
                const hasLoS=checkLineOfSight(u.x,u.y,mousePos.x,mousePos.y), lc=hasLoS?'rgba(255,255,0,0.8)':'rgba(255,0,0,0.8)';
                ctx.beginPath(); ctx.moveTo(u.x,u.y); ctx.lineTo(mousePos.x,mousePos.y); ctx.strokeStyle=lc; ctx.lineWidth=2/state.scale; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
                if (th&&hasLoS) { ctx.beginPath(); ctx.arc(th.x,th.y,th.radius+6,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,0,0.8)'; ctx.lineWidth=3/state.scale; ctx.stroke(); }
            }
        } else if (state.currentAction === 'charge' && !u.hasActedThisPhase) {
            ctx.beginPath(); ctx.arc(u.x,u.y,u.chargeDist,0,Math.PI*2); ctx.fillStyle='rgba(255,165,0,0.05)'; ctx.fill();
            ctx.strokeStyle='rgba(255,165,0,0.4)'; ctx.lineWidth=1/state.scale; ctx.setLineDash([10,5]); ctx.stroke(); ctx.setLineDash([]);
            const dx=mousePos.x-u.x, dy=mousePos.y-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<=u.chargeDist) {
                const b=checkTerrainCollision(u.x,u.y,mousePos.x,mousePos.y)||!checkCollision(mousePos.x,mousePos.y,u)||mousePos.x<0||mousePos.x>MAP_WIDTH||mousePos.y<0||mousePos.y>MAP_HEIGHT;
                ctx.beginPath(); ctx.moveTo(u.x,u.y); ctx.lineTo(mousePos.x,mousePos.y); ctx.strokeStyle=b?'rgba(255,0,0,0.8)':'rgba(255,165,0,0.8)'; ctx.lineWidth=2/state.scale; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(mousePos.x,mousePos.y,u.radius,0,Math.PI*2); ctx.fillStyle=b?'rgba(255,0,0,0.5)':u.color+'80'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1/state.scale; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);
            }
        } else if (state.currentAction === 'melee' && !u.hasActedThisPhase) {
            ctx.beginPath(); ctx.arc(u.x,u.y,u.radius*2+20,0,Math.PI*2); ctx.fillStyle='rgba(255,100,0,0.1)'; ctx.fill(); ctx.strokeStyle='rgba(255,100,0,0.5)'; ctx.lineWidth=1/state.scale; ctx.stroke();
        }
    }
    if (state.selectedUnits.length >= 2 && state.groupAction === 'move') {
        for (const u of state.selectedUnits) {
            if (u.hasActedThisPhase) continue;
            const dx=mousePos.x-u.x, dy=mousePos.y-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            const fx=dist>u.m?u.x+(dx/dist)*u.m:mousePos.x, fy=dist>u.m?u.y+(dy/dist)*u.m:mousePos.y;
            ctx.beginPath(); ctx.moveTo(u.x,u.y); ctx.lineTo(fx,fy); ctx.strokeStyle=dist>u.m?'rgba(255,0,0,0.6)':'rgba(255,255,255,0.45)'; ctx.lineWidth=1.5/state.scale; ctx.setLineDash([4/state.scale,3/state.scale]); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(fx,fy,u.radius,0,Math.PI*2); ctx.fillStyle=dist>u.m?'rgba(255,0,0,0.18)':u.color+'44'; ctx.fill();
        }
    }
    if (state.selectedUnits.length >= 2 && state.groupAction === 'shoot') {
        for (const u of state.selectedUnits) {
            if (u.hasActedThisPhase) continue;
            const dx=mousePos.x-u.x, dy=mousePos.y-u.y, dist=Math.sqrt(dx*dx+dy*dy);
            ctx.beginPath(); ctx.moveTo(u.x,u.y); ctx.lineTo(mousePos.x,mousePos.y); ctx.strokeStyle=dist<=u.rangedWeapon.range&&checkLineOfSight(u.x,u.y,mousePos.x,mousePos.y)?'rgba(255,220,0,0.55)':'rgba(255,0,0,0.25)'; ctx.lineWidth=1.5/state.scale; ctx.setLineDash([4/state.scale,3/state.scale]); ctx.stroke(); ctx.setLineDash([]);
        }
    }
    for (const unit of state.units) { unit.update(); unit.draw(ctx, state.selectedUnit === unit); }
    if (state.selectedUnits.length >= 2) {
        for (const u of state.selectedUnits) { ctx.beginPath(); ctx.arc(u.x,u.y,u.radius+8/state.scale,0,Math.PI*2); ctx.strokeStyle='rgba(200,168,75,0.85)'; ctx.lineWidth=2/state.scale; ctx.setLineDash([6/state.scale,3/state.scale]); ctx.stroke(); ctx.setLineDash([]); }
    }
    for (let i = state.effects.length-1; i >= 0; i--) {
        const ef = state.effects[i];
        if (ef.type==='shoot') { ctx.beginPath(); ctx.moveTo(ef.x,ef.y); ctx.lineTo(ef.tx,ef.ty); ctx.strokeStyle=`rgba(255,255,0,${ef.life})`; ctx.lineWidth=3/state.scale; ctx.stroke(); }
        else if (ef.type==='heal') { ctx.fillStyle=`rgba(0,255,0,${ef.life})`; ctx.font=`${20/state.scale}px sans-serif`; ctx.fillText('+',ef.x,ef.y-(1-ef.life)*30); }
        else if (ef.type==='buff') { ctx.fillStyle=`rgba(0,200,255,${ef.life})`; ctx.font=`${16/state.scale}px sans-serif`; ctx.fillText('Move Up!',ef.x-30,ef.y-(1-ef.life)*30); }
        else if (ef.type==='melee') { ctx.beginPath(); ctx.arc(ef.x,ef.y,20*(1-ef.life),0,Math.PI*2); ctx.fillStyle=`rgba(255,50,0,${ef.life*0.5})`; ctx.fill(); }
        ef.life -= 0.02; if (ef.life <= 0) state.effects.splice(i, 1);
    }
    ctx.setTransform(1,0,0,1,0,0);
    if (isRubberBanding) {
        const rx=Math.min(rubberX1,rubberX2), ry=Math.min(rubberY1,rubberY2), rw=Math.abs(rubberX2-rubberX1), rh=Math.abs(rubberY2-rubberY1);
        ctx.fillStyle='rgba(200,168,75,0.06)'; ctx.fillRect(rx,ry,rw,rh); ctx.strokeStyle='rgba(200,168,75,0.6)'; ctx.lineWidth=1; ctx.setLineDash([5,4]); ctx.strokeRect(rx,ry,rw,rh); ctx.setLineDash([]);
    }
    if (state.winner) { ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='48px sans-serif'; ctx.textAlign='center'; ctx.fillText(`Player ${state.winner} Wins!`,canvas.width/2,canvas.height/2); }
    requestAnimationFrame(draw);
}
