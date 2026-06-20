function showMainMenu() {
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('teamEditor').classList.add('hidden');
    document.getElementById('menuFactions').innerHTML =
        `<div class="menu-faction-group">${UNITS_DB['Space Marines'].units.slice(0,4).map(u=>`<img class="menu-faction-icon" src="${u.icon}" title="${u.name}">`).join('')}</div>` +
        `<span class="menu-vs">VS</span>` +
        `<div class="menu-faction-group">${UNITS_DB['Orks'].units.slice(0,4).map(u=>`<img class="menu-faction-icon" src="${u.icon}" title="${u.name}">`).join('')}</div>`;
}

function showTeamEditor() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('teamEditor').classList.remove('hidden');
    document.getElementById('edFaction').innerHTML = FACTIONS.map(f => `<option value="${f}">${f}</option>`).join('');
    renderEditor();
}

function renderEditor() {
    const td = teamData.p1, fdb = UNITS_DB[td.faction], total = rosterTotal('p1');
    document.getElementById('edFaction').value = td.faction;
    const pct = Math.min(100, total / BUDGET * 100);
    const bc = total > BUDGET ? '#e53935' : total > BUDGET * 0.88 ? '#c8a84b' : '#4caf50';
    const bar = document.getElementById('edBudgetBar'); bar.style.width = pct + '%'; bar.style.background = bc;
    document.getElementById('edBudgetText').innerText = `${total} / ${BUDGET} pts`;

    document.getElementById('edShop').innerHTML = fdb.units.map(def => {
        const entry = td.roster.find(r => r.id === def.id), count = entry ? entry.count : 0;
        const canAdd = total + def.pts <= BUDGET && count < def.maxCount;
        return `<div class="ed-unit-card">
            <img class="ed-unit-icon" src="${def.icon}">
            <div class="ed-unit-info">
                <div class="ed-unit-name">${def.name}</div>
                <div class="ed-unit-role">${def.role} · M${def.m}" T${def.t} Sv${def.sv}+ W${def.w}</div>
                <div class="ed-unit-weapons">
                    <span>⚔ ${def.meleeWeapon.name} WS${def.meleeWeapon.ws}+ S${def.meleeWeapon.s} A${def.meleeWeapon.a}</span>
                    <span>🎯 ${def.rangedWeapon.name} BS${def.rangedWeapon.bs}+ Rng${def.rangedWeapon.range}"</span>
                </div>
            </div>
            <div class="ed-unit-pts">${def.pts}<span>pts</span></div>
            <div class="ed-unit-ctrl">
                <button data-action="minus" data-id="${def.id}" ${count > 0 ? '' : 'disabled'}>−</button>
                <span class="ed-unit-count">${count}</span>
                <button data-action="plus" data-id="${def.id}" ${canAdd ? '' : 'disabled'}>+</button>
            </div>
        </div>`;
    }).join('');

    const entries = td.roster.filter(r => r.count > 0);
    document.getElementById('edRoster').innerHTML = entries.length === 0
        ? '<div class="ed-roster-empty">No units added yet</div>'
        : entries.map(r => {
            const def = fdb.units.find(u => u.id === r.id); if (!def) return '';
            return `<div class="ed-roster-entry">
                <img src="${def.icon}" class="ed-roster-icon">
                <span class="ed-roster-name">${def.name}${r.count > 1 ? ` ×${r.count}` : ''}</span>
                <span class="ed-roster-pts">${def.pts * r.count}pts</span>
                <button data-action="remove" data-id="${def.id}" class="ed-remove-unit">✕</button>
            </div>`;
          }).join('');
    document.getElementById('edRosterTotal').innerText = `Total: ${total} / ${BUDGET} pts`;
}

document.getElementById('edShop').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const { action, id } = btn.dataset, td = teamData.p1, fdb = UNITS_DB[td.faction];
    const def = fdb.units.find(u => u.id === id); if (!def) return;
    const entry = td.roster.find(r => r.id === id), count = entry ? entry.count : 0;
    if (action === 'plus') {
        if (rosterTotal('p1') + def.pts > BUDGET || count >= def.maxCount) return;
        if (entry) entry.count++; else td.roster.push({ id, count: 1 });
    } else if (action === 'minus') {
        if (!entry || entry.count <= 0) return;
        entry.count--;
        if (entry.count === 0) td.roster = td.roster.filter(r => r.id !== id);
    }
    renderEditor();
});

document.getElementById('edRoster').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="remove"]'); if (!btn) return;
    teamData.p1.roster = teamData.p1.roster.filter(r => r.id !== btn.dataset.id);
    renderEditor();
});

document.getElementById('edFaction').addEventListener('change', e => {
    teamData.p1.faction = e.target.value;
    teamData.p1.roster = [];
    renderEditor();
});
function on(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }

on('edSaveBtn',     'click', () => { saveTeamData(); showMainMenu(); });
on('edResetBtn',    'click', () => { teamData.p1.roster = []; renderEditor(); });
on('editorClose',   'click', () => { saveTeamData(); showMainMenu(); });
on('menuEditBtn',   'click', showTeamEditor);
on('menuHostBtn',   'click', () => hostGame());
on('menuJoinBtn',   'click', () => {
    document.getElementById('menuJoinRow').classList.toggle('hidden');
    document.getElementById('menuCodeInput').focus();
});
on('menuConnectBtn','click', () => { const c = document.getElementById('menuCodeInput').value.trim(); if (c) joinGame(c); });
on('menuCodeInput', 'keydown', e => { if (e.key === 'Enter') { const c = e.target.value.trim(); if (c) joinGame(c); } });
on('menuCopyCode',  'click', () => {
    navigator.clipboard.writeText(document.getElementById('menuRoomCode').innerText).then(() => {
        document.getElementById('menuCopyCode').innerText = 'Copied!';
        setTimeout(() => { document.getElementById('menuCopyCode').innerText = 'Copy'; }, 1500);
    });
});

// ── Startup ──
loadTeamData();
showMainMenu();
