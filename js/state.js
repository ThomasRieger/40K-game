const MAP_WIDTH = 1200, MAP_HEIGHT = 880;

const state = {
    round: 1, turn: 1,
    phases: ['Command', 'Movement', 'Shooting', 'Charge', 'Fight'],
    currentPhaseIndex: 0,
    cp: { 1: 1, 2: 1 },
    units: [], terrain: [], effects: [],
    selectedUnit: null, currentAction: null,
    winner: null, scale: 1.0, camera: { x: 0, y: 0 },
    selectedUnits: [], groupAction: null, combatQueue: []
};

const combat = {
    attacker: null, target: null, weapon: null,
    isMelee: false, step: 'HIT', rollCount: 0,
    neededValue: 0, results: [], groupAttackers: null
};

let mousePos = { x: 0, y: 0 };
let isMouseDown = false, isPanning = false, panStartX = 0, panStartY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0, clickedOnUnitAtStart = null;
let isRubberBanding = false, rubberX1 = 0, rubberY1 = 0, rubberX2 = 0, rubberY2 = 0;

// Stubs — overridden by online.js at runtime
var onlineSendDice    = function() {};
var onlineSync        = function() {};
var onlineSaveRollHook = function() { return false; };
var isOnline          = function() { return false; };
var isMyTurn          = function() { return true; };
