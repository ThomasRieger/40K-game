let peer = null, conn = null;
let myTeam = 0; // 0=offline, 1=host(P1), 2=guest(P2)

isOnline = function() { return myTeam !== 0; };
isMyTurn = function() { return !isOnline() || state.turn === myTeam; };

onlineSendDice = function(action, data) {
    if (!conn || !conn.open) return;
    // save_result is sent by the defender (not the active turn player)
    if (action !== 'save_result' && !isMyTurn()) return;
    conn.send({ type: 'dice_' + action, ...data });
}

let isSaveRollMode = false;

onlineSaveRollHook = function(rolls, needed) {
    if (!isSaveRollMode) return false;
    isSaveRollMode = false;
    onlineSendDice('save_result', { rolls, needed });
    document.getElementById('diceOverlay').classList.add('hidden');
    return true;
}

// Open dice overlay without triggering another send (avoids loop)
function applyDiceOpen(title, count, needed, canRoll = false) {
    document.getElementById('diceOverlay').classList.remove('hidden');
    document.getElementById('diceTitle').innerText = title;
    diceContainer.innerHTML = '';
    rollDiceBtn.classList.toggle('hidden', !canRoll);
    continueBtn.classList.add('hidden'); continueBtn.disabled = false; continueBtn.innerText = 'Continue';
    for (let i = 0; i < count; i++) diceContainer.appendChild(makeDie());
    if (canRoll) isSaveRollMode = true;
}

function applyDiceRolled(rolls, needed) {
    const dice = Array.from(diceContainer.querySelectorAll('.die'));
    dice.forEach((die, i) => {
        const r = rolls[i], inner = die.querySelector('.die-inner');
        inner.style.transition = 'transform 0.45s cubic-bezier(0.2,0.8,0.3,1.0)';
        inner.style.transform = faceShowTransform[r];
        if (r >= needed) die.classList.add('success'); else die.classList.add('fail');
    });
    continueBtn.classList.remove('hidden'); continueBtn.disabled = true; continueBtn.innerText = 'Waiting…';
}

function applyDiceSaveResult(rolls, needed) {
    const dice = Array.from(diceContainer.querySelectorAll('.die'));
    dice.forEach((die, i) => {
        const r = rolls[i], inner = die.querySelector('.die-inner');
        inner.style.transition = 'transform 0.45s cubic-bezier(0.2,0.8,0.3,1.0)';
        inner.style.transform = faceShowTransform[r];
        if (r >= needed) die.classList.add('success'); else die.classList.add('fail');
    });
    continueBtn.classList.remove('hidden'); continueBtn.disabled = false; continueBtn.innerText = 'Continue';
}

onlineSync = function() {
    if (!conn || !conn.open) return;
    conn.send({
        type: 'state',
        aliveUids: state.units.map(u => u.uid),
        units: state.units.map(u => ({
            uid: u.uid, x: u.x, y: u.y, targetX: u.targetX, targetY: u.targetY,
            isMoving: u.isMoving, hp: u.hp, hasActedThisPhase: u.hasActedThisPhase,
            buffed: u.buffed, m: u.m
        })),
        cp: { ...state.cp },
        round: state.round, turn: state.turn,
        currentPhaseIndex: state.currentPhaseIndex, winner: state.winner
    });
}

function applySync(data) {
    state.units = state.units.filter(u => data.aliveUids.includes(u.uid));
    for (const su of data.units) {
        const u = state.units.find(u => u.uid === su.uid);
        if (u) Object.assign(u, su);
    }
    state.cp = data.cp; state.round = data.round; state.turn = data.turn;
    state.currentPhaseIndex = data.currentPhaseIndex; state.winner = data.winner;
    state.selectedUnit = null; state.currentAction = null;
    state.selectedUnits = []; state.groupAction = null;
    updateUI(); updateGroupUI();
}

function setOnlineStatus(msg, connected) {
    const el = document.getElementById('onlineStatus');
    el.innerText = msg;
    el.className = connected ? 'connected' : '';
}

function onData(data) {
    if (data.type === 'init') {
        teamData = data.teamData;
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('teamEditor').classList.add('hidden');
        initGame();
        if (!gameStarted) { gameStarted = true; draw(); }
        setOnlineStatus('Connected · You are Player 2', true);
        document.getElementById('onlinePanel').classList.remove('hidden');
    } else if (data.type === 'roster') {
        // Host receives guest's team, merges, then starts both sides
        teamData.p2 = data.p2;
        conn.send({ type: 'init', teamData: JSON.parse(JSON.stringify(teamData)) });
        setOnlineStatus('Connected · You are Player 1', true);
        if (!gameStarted) startGame(); else initGame();
    } else if (data.type === 'state') {
        applySync(data);
    } else if (data.type === 'dice_open') {
        applyDiceOpen(data.title, data.count, data.needed, false); // spectator
    } else if (data.type === 'dice_open_defender') {
        // Attacker watches; defender can roll
        applyDiceOpen(data.title, data.count, data.needed, !isMyTurn());
    } else if (data.type === 'dice_rolled') {
        applyDiceRolled(data.rolls, data.needed);
    } else if (data.type === 'dice_save_result') {
        applyDiceSaveResult(data.rolls, data.needed); // attacker sees results, clicks Continue
    } else if (data.type === 'dice_close') {
        document.getElementById('diceOverlay').classList.add('hidden');
    }
}

function hostGame() {
    myTeam = 1;
    setOnlineStatus('Creating room...');
    peer = new Peer();
    peer.on('open', id => {
        document.getElementById('onlineRoomCode').innerText = id;
        document.getElementById('onlineRoomRow').classList.remove('hidden');
        document.getElementById('onlineSetup').classList.add('hidden');
        setOnlineStatus('Waiting for opponent...');
    });
    peer.on('connection', c => {
        conn = c;
        conn.on('open', () => setOnlineStatus('Opponent connected — waiting for their team…', true));
        conn.on('data', onData);
        conn.on('close', () => setOnlineStatus('Opponent disconnected'));
    });
    peer.on('error', e => setOnlineStatus('Error: ' + e.type));
}

function joinGame() {
    const code = document.getElementById('onlineCodeInput').value.trim();
    if (!code) return;
    myTeam = 2;
    setOnlineStatus('Connecting...');
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(code);
        conn.on('open', () => {
            conn.send({ type: 'roster', p2: JSON.parse(JSON.stringify(teamData.p1)) });
            setOnlineStatus('Sending team… waiting for host', true);
        });
        conn.on('data', onData);
        conn.on('close', () => setOnlineStatus('Host disconnected'));
        conn.on('error', () => setOnlineStatus('Connection error'));
    });
    peer.on('error', e => setOnlineStatus('Error: ' + e.type));
}

// ── UI events ──
document.getElementById('onlineToggle').addEventListener('click', () => {
    document.getElementById('onlinePanel').classList.toggle('hidden');
});
document.getElementById('btnHost').addEventListener('click', hostGame);
document.getElementById('btnJoin').addEventListener('click', () => {
    document.getElementById('onlineJoinRow').classList.toggle('hidden');
});
document.getElementById('btnConnect').addEventListener('click', joinGame);
document.getElementById('onlineCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinGame(); });
document.getElementById('btnCopyCode').addEventListener('click', () => {
    const code = document.getElementById('onlineRoomCode').innerText;
    navigator.clipboard.writeText(code).then(() => {
        document.getElementById('btnCopyCode').innerText = 'Copied!';
        setTimeout(() => { document.getElementById('btnCopyCode').innerText = 'Copy'; }, 1500);
    });
});
