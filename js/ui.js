const uiSheet = document.getElementById('characterSheet');
const turnInd = document.getElementById('turnIndicator');
const phaseInd = document.getElementById('phaseIndicator');
const cpInd = document.getElementById('cpIndicator');
const enemyTooltip = document.getElementById('enemyTooltip');

function setCpPips(elId, count) {
    const el = document.getElementById(elId); el.innerHTML = '';
    for (let i = 0; i < Math.min(count, 6); i++) { const d = document.createElement('div'); d.className = 'cp-pip'; el.appendChild(d); }
}

function updateUI() {
    const cp = state.phases[state.currentPhaseIndex];
    document.getElementById('p1UnitCount').innerText = state.units.filter(u => u.team === 1).length;
    document.getElementById('p1CpCount').innerText = state.cp[1];
    document.getElementById('p1PtsCount').innerText = state.units.filter(u => u.team === 1).reduce((s, u) => s + u.pts, 0) + ' pts';
    document.getElementById('p2UnitCount').innerText = state.units.filter(u => u.team === 2).length;
    document.getElementById('p2CpCount').innerText = state.cp[2];
    document.getElementById('p2PtsCount').innerText = state.units.filter(u => u.team === 2).reduce((s, u) => s + u.pts, 0) + ' pts';
    setCpPips('p1CpPips', state.cp[1]); setCpPips('p2CpPips', state.cp[2]);
    document.getElementById('nextPhaseBtn').disabled = isOnline() && !isMyTurn();
    const banner = document.getElementById('onlineTurnBanner'); if (banner) banner.classList.toggle('show', isOnline() && !isMyTurn());
    document.getElementById('p1Active').classList.toggle('hidden', state.turn !== 1);
    document.getElementById('p2Active').classList.toggle('hidden', state.turn !== 2);
    document.getElementById('roundNumber').innerText = state.round;
    turnInd.innerText = `Player ${state.turn}'s Turn`; turnInd.style.color = state.turn === 1 ? '#4a90e2' : '#e24a4a';
    phaseInd.innerText = `${cp} Phase`; cpInd.innerText = `CP: ${state.cp[state.turn]}`;
    if (state.selectedUnit && state.selectedUnit.team === state.turn) {
        const u = state.selectedUnit;
        uiSheet.classList.remove('hidden', 'team1', 'team2'); uiSheet.classList.add(`team${state.turn}`);
        document.getElementById('unitName').innerText = u.name;
        document.getElementById('unitType').innerText = u.type;
        document.getElementById('statMove').innerText = Math.round(u.m / 20);
        document.getElementById('statToughness').innerText = u.t;
        document.getElementById('statSave').innerText = u.sv;
        document.getElementById('statWounds').innerText = `${u.hp}/${u.w}`;
        document.getElementById('statLd').innerText = u.ld;
        document.getElementById('statOc').innerText = u.oc;
        const wt = document.getElementById('woundsTrack'); wt.innerHTML = '';
        for (let i = 0; i < u.w; i++) { const p = document.createElement('div'); p.className = 'wound-pip' + (i < u.hp ? ' filled' : ''); wt.appendChild(p); }
        const mw = u.meleeWeapon;
        document.getElementById('meleeWeaponInfo').innerHTML = `<span class="weapon-name">${mw.name}</span><span class="weapon-profile"><b>WS</b>${mw.ws}+ &nbsp;<b>S</b>${mw.s} &nbsp;<b>AP</b>${mw.ap} &nbsp;<b>D</b>${mw.d} &nbsp;<b>A</b>${mw.a}</span>`;
        const rw = u.rangedWeapon;
        document.getElementById('rangedWeaponInfo').innerHTML = `<span class="weapon-name">${rw.name}</span><span class="weapon-profile"><b>BS</b>${rw.bs}+ &nbsp;<b>S</b>${rw.s} &nbsp;<b>AP</b>${rw.ap} &nbsp;<b>D</b>${rw.d} &nbsp;<b>A</b>${rw.a} &nbsp;<b>Rng</b>${Math.round(rw.range/20)}"</span>`;
        const btnA=document.getElementById('btnAbility'), btnMo=document.getElementById('btnMove'), btnCh=document.getElementById('btnCharge'), btnS=document.getElementById('btnShoot'), btnMe=document.getElementById('btnMelee');
        btnA.disabled=true; btnMo.disabled=true; btnCh.disabled=true; btnS.disabled=true; btnMe.disabled=true;
        if (!u.hasActedThisPhase && isMyTurn()) { if (cp==='Command'&&state.cp[state.turn]>=1) btnA.disabled=false; else if (cp==='Movement') btnMo.disabled=false; else if (cp==='Shooting') btnS.disabled=false; else if (cp==='Charge') btnCh.disabled=false; else if (cp==='Fight') btnMe.disabled=false; }
    } else { uiSheet.classList.add('hidden'); document.getElementById('abilityPopup').classList.add('hidden'); }
}

function updateGroupUI() {
    const gp = document.getElementById('groupPanel');
    if (state.selectedUnits.length >= 2) {
        uiSheet.classList.add('hidden'); document.getElementById('abilityPopup').classList.add('hidden');
        gp.classList.remove('hidden'); document.getElementById('groupCount').innerText = state.selectedUnits.length;
        const cp = state.phases[state.currentPhaseIndex], anyCanAct = state.selectedUnits.some(u => !u.hasActedThisPhase);
        document.getElementById('grpMove').disabled   = (cp !== 'Movement' || !anyCanAct);
        document.getElementById('grpShoot').disabled  = (cp !== 'Shooting' || !anyCanAct);
        document.getElementById('grpCharge').disabled = (cp !== 'Charge'   || !anyCanAct);
        document.getElementById('grpMelee').disabled  = (cp !== 'Fight'    || !anyCanAct);
    } else { gp.classList.add('hidden'); state.groupAction = null; }
}

function showEnemyTooltip(unit, screenX, screenY) {
    document.getElementById('etName').innerText = unit.name;
    document.getElementById('etType').innerText = unit.type;
    document.getElementById('etMove').innerText = Math.round(unit.m / 20);
    document.getElementById('etT').innerText = unit.t; document.getElementById('etSv').innerText = unit.sv;
    document.getElementById('etW').innerText = `${unit.hp}/${unit.w}`;
    document.getElementById('etLd').innerText = unit.ld; document.getElementById('etOc').innerText = unit.oc;
    const mw = unit.meleeWeapon, rw = unit.rangedWeapon;
    document.getElementById('etWeapons').innerHTML =
        `<div class="et-weapon"><span class="et-weapon-name">${mw.name}</span><span class="et-weapon-stats">WS${mw.ws}+ S${mw.s} AP${mw.ap} D${mw.d} A${mw.a}</span></div>` +
        `<div class="et-weapon"><span class="et-weapon-name">${rw.name}</span><span class="et-weapon-stats">BS${rw.bs}+ S${rw.s} AP${rw.ap} D${rw.d} A${rw.a} Rng${Math.round(rw.range/20)}"</span></div>`;
    const tw = 230, th = enemyTooltip.offsetHeight || 160;
    enemyTooltip.style.left = `${Math.min(screenX+18, window.innerWidth-tw-10)}px`;
    enemyTooltip.style.top  = `${Math.min(screenY+18, window.innerHeight-th-10)}px`;
    enemyTooltip.classList.remove('hidden');
}
function hideEnemyTooltip() { enemyTooltip.classList.add('hidden'); }

// ── Button event listeners ──
document.getElementById('toggleLogBtn').addEventListener('click', () => {
    const log = document.getElementById('globalCombatLog'); log.classList.toggle('hidden');
    document.getElementById('toggleLogBtn').innerText = log.classList.contains('hidden') ? 'Show Logs' : 'Hide Logs';
});
document.getElementById('btnAbility').addEventListener('click', () => { if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase && state.cp[state.turn] >= 1) document.getElementById('abilityPopup').classList.toggle('hidden'); });
document.getElementById('btnHeal').addEventListener('click', () => {
    if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase && state.cp[state.turn] >= 1) {
        state.cp[state.turn]--; state.selectedUnit.hp = Math.min(state.selectedUnit.w, state.selectedUnit.hp + 2);
        state.selectedUnit.hasActedThisPhase = true; addEffect('heal', state.selectedUnit.x, state.selectedUnit.y, 0, 0);
        document.getElementById('abilityPopup').classList.add('hidden'); updateUI(); onlineSync();
    }
});
document.getElementById('btnDash').addEventListener('click', () => {
    if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase && state.cp[state.turn] >= 1) {
        state.cp[state.turn]--; state.selectedUnit.m += 50; state.selectedUnit.buffed = true;
        state.selectedUnit.hasActedThisPhase = true; addEffect('buff', state.selectedUnit.x, state.selectedUnit.y, 0, 0);
        document.getElementById('abilityPopup').classList.add('hidden'); updateUI(); onlineSync();
    }
});
document.getElementById('btnMove').addEventListener('click',   () => { if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase) { state.currentAction = 'move';   updateUI(); } });
document.getElementById('btnCharge').addEventListener('click', () => { if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase) { state.currentAction = 'charge'; updateUI(); } });
document.getElementById('btnShoot').addEventListener('click',  () => { if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase) { state.currentAction = 'shoot';  updateUI(); } });
document.getElementById('btnMelee').addEventListener('click',  () => { if (state.selectedUnit && !state.selectedUnit.hasActedThisPhase) { state.currentAction = 'melee';  updateUI(); } });
document.getElementById('nextPhaseBtn').addEventListener('click', () => {
    if (state.winner) return; state.currentPhaseIndex++;
    if (state.currentPhaseIndex >= state.phases.length) {
        state.currentPhaseIndex = 0; state.turn = state.turn === 1 ? 2 : 1;
        if (state.turn === 1) state.round++;
        state.cp[state.turn]++;
        for (const unit of state.units) if (unit.team === state.turn) unit.buffed = false;
    }
    for (const unit of state.units) unit.hasActedThisPhase = false;
    state.selectedUnit = null; state.currentAction = null; state.selectedUnits = []; state.groupAction = null; state.combatQueue = [];
    document.getElementById('groupPanel').classList.add('hidden'); updateUI(); onlineSync();
});
document.getElementById('closeSheetBtn').addEventListener('click', () => { state.selectedUnit = null; state.currentAction = null; updateUI(); });
document.getElementById('legendToggleBtn').addEventListener('click', () => {
    document.getElementById('statsLegend').classList.toggle('hidden');
    document.getElementById('legendToggleBtn').classList.toggle('active');
});
document.getElementById('grpMove').addEventListener('click',   () => { state.groupAction = 'move'; });
document.getElementById('grpShoot').addEventListener('click',  () => { state.groupAction = 'shoot'; });
document.getElementById('grpCharge').addEventListener('click', () => { state.groupAction = 'charge'; });
document.getElementById('grpMelee').addEventListener('click',  () => { state.groupAction = 'melee'; });
document.getElementById('closeGroupBtn').addEventListener('click', () => { state.selectedUnits = []; state.groupAction = null; updateGroupUI(); });

// ── Draggable panels ──
const sheetHeader = document.getElementById('sheetHeader');
let isDraggingSheet = false, sheetOffsetX = 0, sheetOffsetY = 0;
sheetHeader.addEventListener('mousedown', e => { isDraggingSheet = true; const r = uiSheet.getBoundingClientRect(); sheetOffsetX = e.clientX-r.left; sheetOffsetY = e.clientY-r.top; e.preventDefault(); });

const logPanel = document.getElementById('globalCombatLog'), logHeader = document.getElementById('logHeader');
let isDraggingLog = false, logOffsetX = 0, logOffsetY = 0;
logHeader.addEventListener('mousedown', e => { isDraggingLog = true; const r = logPanel.getBoundingClientRect(); logOffsetX = e.clientX-r.left; logOffsetY = e.clientY-r.top; e.preventDefault(); });

document.addEventListener('mousemove', e => {
    if (isDraggingSheet) { uiSheet.style.left=`${e.clientX-sheetOffsetX}px`; uiSheet.style.top=`${e.clientY-sheetOffsetY}px`; uiSheet.style.bottom='auto'; uiSheet.style.right='auto'; }
    if (isDraggingLog)   { logPanel.style.left=`${e.clientX-logOffsetX}px`; logPanel.style.top=`${e.clientY-logOffsetY}px`; }
});
document.addEventListener('mouseup', () => { isDraggingSheet = false; isDraggingLog = false; });
