
'use strict';

const SIZE = 20;
const MINES = SIZE*2 ;
const CELL = 20;
const VEIL_TONE = 'magenta';

let mines, counts, cover, veil, flags;
let veilPicker, statusLine;
let previousStatusLine = '';
let history = [];
let firstClick = true;

function setup() {
  Quadrille.cellLength = CELL;

  const canvas = createCanvas(SIZE * CELL, SIZE * CELL);
  canvas.parent('game');
  canvas.elt.addEventListener('contextmenu', event => {
    event.preventDefault();
  });

  veilPicker = createColorPicker(VEIL_TONE);
  veilPicker.parent('controls');
  veilPicker.id('veil-color');
  veilPicker.input(hide);

  statusLine = select('#status');

  deal();
}

function deal() {
  mines = createQuadrille(SIZE, SIZE, MINES, '💣');
  counts = createQuadrille(SIZE, SIZE);

  mines.visit(({ row, col }) => {
    const near = mines.ring(row, col).order;

    if (near > 0) {
      counts.fill(row, col, near.toString());
    }
  }, ({ value }) => value === null);

  cover = Quadrille.or(mines, counts);
  cover.replace(color('red')).fill(color('green'));

  flags = createQuadrille(SIZE, SIZE);
  history = [];
  firstClick = true;

  hide();
}

function hide() {
  if (!cover) return;

  const veilColor = veilPicker
    ? color(veilPicker.value())
    : color(VEIL_TONE);

  veil = cover.clone().replace(veilColor);
}

function uncover(...args) {
  cover.clear(...args);

  if (args.length === 0) {
    flags.clear();
  } else {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (!cover.isFilled(row, col)) {
          flags.clear(row, col);
        }
      }
    }
  }

  hide();
}

function saveHistory() {
  history.push({
    cover: cover.clone(),
    flags: flags.clone(),
    firstClick
  });
}

function undo() {
  if (history.length === 0) return;

  const previous = history.pop();

  cover = previous.cover;
  flags = previous.flags;
  firstClick = previous.firstClick;

  hide();
}

function status() {
  if (cover.order === 0) return 'boom';

  const flagsWin = Quadrille.xor(flags, mines).order === 0;

  if (cover.order === mines.order || flagsWin) {
    return 'cleared';
  }

  return 'playing';
}

function draw() {
  background('moccasin');

  drawQuadrille(mines);
  drawQuadrille(counts);
  drawQuadrille(veil, {
    outline: color('lime')
  });

  if (keyIsDown(86)) {
    drawQuadrille(
      Quadrille.diff(cover, mines).replace(color('deepskyblue')),
      { outline: color('lime') }
    );

    drawQuadrille(
      Quadrille.and(cover, mines).replace(color('yellow')),
      { outline: color('lime') }
    );
  }

  drawQuadrille(flags, {
    outline: color('lime')
  });

  const state = status();
  const mistakes = Quadrille.diff(flags, mines).order;
  const safeLeft = max(0, cover.order - mines.order);

  const message = state === 'playing'
    ? `Seguras: ${safeLeft} | Banderas: ${flags.order}/${mines.order} | Errores: ${mistakes}`
    : state === 'boom'
      ? 'Perdiste'
      : '¡Ganaste!';

  if (message !== previousStatusLine) {
    statusLine.html(message);
    previousStatusLine = message;
  }
}

function mousePressed(event) {
  const rightClick =
    event?.button === 2 || mouseButton === RIGHT;

  const row = veil.mouseRow;
  const col = veil.mouseCol;

  if (!veil.isValid(row, col)) return false;

  if (rightClick) {
    if (status() !== 'playing') return false;
    if (!cover.isFilled(row, col)) return false;

    saveHistory();

    if (flags.isFilled(row, col)) {
      flags.clear(row, col);
    } else {
      flags.fill(row, col, '🚩');
    }

    return false;
  }

  if (
    event &&
    typeof event.button === 'number' &&
    event.button !== 0
  ) {
    return false;
  }

  if (status() !== 'playing') return false;
  if (!cover.isFilled(row, col)) return false;
  if (flags.isFilled(row, col)) return false;

  if (firstClick) {
    while (
      mines.isFilled(row, col) ||
      counts.isFilled(row, col)
    ) {
      deal();
    }
  }

  saveHistory();
  firstClick = false;

  if (mines.isFilled(row, col)) {
    uncover();
  } else if (counts.isFilled(row, col)) {
    uncover(row, col);
  } else {
    uncover(row, col, true);
  }

  return false;
}

function keyPressed() {
  if (key === 'u' || key === 'U') {
    undo();
    return false;
  }

  if (key === 'v' || key === 'V') {
    return false;
  }

  if (key.length === 1) {
    deal();
  }

  return false;
}
