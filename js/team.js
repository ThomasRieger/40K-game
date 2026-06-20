const BUDGET = 500;
const FACTIONS = Object.keys(UNITS_DB);

const DEFAULT_TEAMS = {
    p1: { faction: 'Space Marines', roster: [{id:'captain',count:1},{id:'tactical',count:3},{id:'terminator',count:1}] },
    p2: { faction: 'Orks',          roster: [{id:'warboss', count:1},{id:'boy',     count:5},{id:'meganob',  count:1}] }
};

let teamData = JSON.parse(JSON.stringify(DEFAULT_TEAMS));

function loadTeamData() {
    try { const s = localStorage.getItem('w40k_teams'); if (s) teamData = JSON.parse(s); }
    catch(e) { teamData = JSON.parse(JSON.stringify(DEFAULT_TEAMS)); }
}

function saveTeamData() {
    try { localStorage.setItem('w40k_teams', JSON.stringify(teamData)); } catch(e) {}
}

function rosterTotal(playerKey) {
    const td = teamData[playerKey], fdb = UNITS_DB[td.faction];
    if (!fdb) return 0;
    return td.roster.reduce((sum, entry) => {
        const def = fdb.units.find(u => u.id === entry.id);
        return sum + (def ? def.pts * entry.count : 0);
    }, 0);
}

function layoutGroupedPositions(spawnUnits, team) {
    const margin = 65, colSpacing = 55, rowSpacing = 50;
    const maxRows = Math.floor((MAP_HEIGHT - margin * 2) / rowSpacing); // ~15 per column

    // Group consecutive same-type units
    const groups = [];
    for (const u of spawnUnits) {
        if (!groups.length || groups[groups.length-1][0].def.id !== u.def.id) groups.push([]);
        groups[groups.length-1].push(u);
    }

    // Pack groups into columns; start a new column if group doesn't fit
    const cols = [[]];
    for (const group of groups) {
        if (cols[cols.length-1].length > 0 && cols[cols.length-1].length + group.length > maxRows) cols.push([]);
        let rem = [...group];
        while (rem.length) {
            const c = cols[cols.length-1], space = maxRows - c.length;
            c.push(...rem.splice(0, space));
            if (rem.length) cols.push([]);
        }
    }

    // Assign positions — col 0 is closest to player's edge
    const positions = [];
    for (let ci = 0; ci < cols.length; ci++) {
        const col = cols[ci];
        const colX = team === 1 ? margin + ci * colSpacing : MAP_WIDTH - margin - ci * colSpacing;
        const startY = MAP_HEIGHT / 2 - ((col.length - 1) * rowSpacing) / 2;
        for (let ri = 0; ri < col.length; ri++) positions.push({ x: colX, y: startY + ri * rowSpacing });
    }
    return positions;
}

function spawnTeam(teamNum, teamEntry) {
    const fdb = UNITS_DB[teamEntry.faction];
    if (!fdb) return [];
    const results = [], nc = {};
    for (const entry of teamEntry.roster) {
        if (!entry.count || entry.count <= 0) continue;
        const def = fdb.units.find(u => u.id === entry.id);
        if (!def) continue;
        for (let i = 0; i < entry.count; i++) {
            nc[def.id] = (nc[def.id] || 0) + 1;
            results.push({ def, name: entry.count > 1 ? `${def.name} ${nc[def.id]}` : def.name });
        }
    }
    return results;
}
