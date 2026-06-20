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
    const x = team === 1 ? 100 : MAP_WIDTH - 100;
    const unitSpacing = 52, groupGap = 28;
    // Build groups of consecutive same-type units
    const groups = [];
    for (const u of spawnUnits) {
        if (!groups.length || groups[groups.length - 1][0].def.id !== u.def.id) groups.push([]);
        groups[groups.length - 1].push(u);
    }
    const totalH = groups.reduce((h, g) => h + g.length * unitSpacing, 0) + (groups.length - 1) * groupGap;
    let y = MAP_HEIGHT / 2 - totalH / 2 + unitSpacing / 2;
    const positions = [];
    for (const group of groups) {
        for (const _ of group) { positions.push({ x, y }); y += unitSpacing; }
        y += groupGap;
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
