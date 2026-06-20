const diceOverlay = document.getElementById('diceOverlay');
const diceContainer = document.getElementById('diceContainer');
const diceTitle = document.getElementById('diceTitle');
const rollDiceBtn = document.getElementById('rollDiceBtn');
const continueBtn = document.getElementById('continueCombatBtn');

const pipLayouts = {
    1:[0,0,0,0,1,0,0,0,0], 2:[0,0,1,0,0,0,1,0,0], 3:[0,0,1,0,1,0,1,0,0],
    4:[1,0,1,0,0,0,1,0,1], 5:[1,0,1,0,1,0,1,0,1], 6:[1,0,1,1,0,1,1,0,1]
};
const faceShowTransform = {
    1:'rotateX(-20deg) rotateY(0deg)',   2:'rotateX(-20deg) rotateY(-90deg)',
    3:'rotateX(70deg) rotateY(0deg)',    4:'rotateX(-70deg) rotateY(0deg)',
    5:'rotateX(-20deg) rotateY(90deg)',  6:'rotateX(-20deg) rotateY(180deg)'
};

function makeDie() {
    const wrapper = document.createElement('div'); wrapper.className = 'die';
    const inner = document.createElement('div'); inner.className = 'die-inner';
    for (let v = 1; v <= 6; v++) {
        const face = document.createElement('div'); face.className = `face face-${v}`;
        face.innerHTML = pipLayouts[v].map(on => `<div class="pip${on?'':' empty'}"></div>`).join('');
        inner.appendChild(face);
    }
    wrapper.appendChild(inner); return wrapper;
}

function showDiceModal(title, count, needed, spectator = false, roller = 'attacker') {
    const isSpectator = spectator || (roller === 'defender' && isOnline());
    diceOverlay.classList.remove('hidden'); diceTitle.innerText = title;
    diceContainer.innerHTML = '';
    rollDiceBtn.classList.toggle('hidden', isSpectator);
    continueBtn.classList.add('hidden'); continueBtn.disabled = false; continueBtn.innerText = 'Continue';
    for (let i = 0; i < count; i++) diceContainer.appendChild(makeDie());
    onlineSendDice(roller === 'defender' ? 'open_defender' : 'open', { title, count, needed });
}

function logCombat(msg, team = 0) {
    const log = document.getElementById('logContent'), div = document.createElement('div');
    if (team === 1) div.className = 'log-entry-p1'; else if (team === 2) div.className = 'log-entry-p2'; else div.className = 'log-entry-sys';
    div.innerText = msg; log.insertBefore(div, log.firstChild);
}

function startCombat(attacker, target, isMelee) {
    combat.attacker = attacker; combat.target = target; combat.isMelee = isMelee;
    combat.weapon = isMelee ? attacker.meleeWeapon : attacker.rangedWeapon;
    combat.step = 'HIT'; combat.groupAttackers = null;
    combat.neededValue = isMelee ? combat.weapon.ws : combat.weapon.bs;
    showDiceModal(`Player ${attacker.team}: Roll to Hit (${combat.neededValue}+)`, combat.weapon.a, combat.neededValue);
}

function startGroupCombat(attackers, target, isMelee) {
    const first = attackers[0];
    combat.attacker = first; combat.target = target; combat.isMelee = isMelee;
    combat.weapon = isMelee ? first.meleeWeapon : first.rangedWeapon;
    combat.step = 'HIT'; combat.groupAttackers = attackers;
    combat.neededValue = isMelee ? combat.weapon.ws : combat.weapon.bs;
    const totalDice = attackers.reduce((s, u) => s + (isMelee ? u.meleeWeapon.a : u.rangedWeapon.a), 0);
    showDiceModal(`Group Attack (${attackers.length} units) — Roll to Hit (${combat.neededValue}+)`, totalDice, combat.neededValue);
}

function finishRoll(successes) {
    combat.rollCount = successes; continueBtn.classList.remove('hidden');
    if (combat.step === 'HIT') logCombat(`${combat.attacker.name} scored ${successes} hits.`, combat.attacker.team);
    else if (combat.step === 'WOUND') logCombat(`${combat.attacker.name} scored ${successes} wounds.`, combat.attacker.team);
}

function endCombat() {
    onlineSendDice('close', {});
    diceOverlay.classList.add('hidden');
    if (combat.groupAttackers) { combat.groupAttackers.forEach(u => u.hasActedThisPhase = true); combat.groupAttackers = null; }
    else combat.attacker.hasActedThisPhase = true;
    state.combatQueue = []; state.selectedUnit = null; state.currentAction = null;
    if (state.selectedUnits.length >= 2) { state.groupAction = null; updateGroupUI(); } else updateUI();
    onlineSync();
}

rollDiceBtn.addEventListener('click', () => {
    rollDiceBtn.classList.add('hidden');
    const dice = Array.from(diceContainer.querySelectorAll('.die'));
    const rolls = dice.map(() => rollD6()); // pre-generate so we can sync
    let successes = 0;
    dice.forEach((die, i) => {
        const r = rolls[i], inner = die.querySelector('.die-inner');
        inner.style.animationDelay = `-${(Math.random()*0.38).toFixed(2)}s`; inner.classList.add('rolling');
        setTimeout(() => {
            inner.classList.remove('rolling'); inner.style.animationDelay = '';
            inner.style.transition = 'transform 0.45s cubic-bezier(0.2,0.8,0.3,1.0)'; inner.style.transform = faceShowTransform[r];
            if (r >= combat.neededValue) { die.classList.add('success'); successes++; } else die.classList.add('fail');
            if (i === dice.length - 1) setTimeout(() => {
                if (onlineSaveRollHook(rolls, combat.neededValue)) return;
                finishRoll(successes); onlineSendDice('rolled', { rolls, needed: combat.neededValue });
            }, 480);
        }, 380 + i * 90);
    });
});

continueBtn.addEventListener('click', () => {
    if (combat.step === 'HIT') {
        if (combat.rollCount === 0) { endCombat(); return; }
        combat.step = 'WOUND'; combat.neededValue = getToWound(combat.weapon.s, combat.target.t);
        showDiceModal(`Player ${combat.attacker.team}: Roll to Wound (${combat.neededValue}+)`, combat.rollCount, combat.neededValue);
    } else if (combat.step === 'WOUND') {
        if (combat.rollCount === 0) { endCombat(); return; }
        combat.step = 'SAVE'; combat.neededValue = combat.target.sv + combat.weapon.ap;
        showDiceModal(`Player ${combat.target.team}: Saving Throw (${combat.neededValue}+)`, combat.rollCount, combat.neededValue, false, 'defender');
    } else if (combat.step === 'SAVE') {
        let fails = 0; diceContainer.querySelectorAll('.die').forEach(die => { if (!die.classList.contains('success')) fails++; });
        const dmg = fails * combat.weapon.d; combat.target.hp -= dmg;
        logCombat(`${combat.target.name} took ${dmg} damage!`, combat.target.team);
        if (combat.target.hp <= 0) { logCombat(`${combat.target.name} destroyed!`); checkDeath(combat.target); }
        endCombat();
    }
});
