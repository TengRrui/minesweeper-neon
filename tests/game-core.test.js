const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/game-core.js');

test('creates a rectangular board with stable indexes', () => {
  const cells = core.createCells(3, 4);
  assert.equal(cells.length, 12);
  assert.deepEqual(cells[0], {
    index: 0,
    isMine: false,
    isRevealed: false,
    isFlagged: false,
    adjacentMines: 0,
  });
});

test('neighbors stay inside the board', () => {
  assert.deepEqual(core.getNeighbors(0, 3, 4), [1, 4, 5]);
  assert.deepEqual(core.getNeighbors(5, 3, 4), [0, 1, 2, 4, 6, 8, 9, 10]);
});

test('first move keeps the clicked cell and its neighborhood clear', () => {
  const cells = core.createCells(5, 5);
  core.placeMines(cells, 5, 5, 10, 12, () => 0.25);
  for (const index of [6, 7, 8, 11, 12, 13, 16, 17, 18]) {
    assert.equal(cells[index].isMine, false);
  }
});

test('calculates adjacent mines and reveals a zero area', () => {
  const cells = core.createCells(3, 3);
  cells[0].isMine = true;
  core.calculateAdjacencies(cells, 3, 3);
  assert.equal(cells[1].adjacentMines, 1);
  core.revealFrom(cells, 3, 3, 8);
  assert.equal(cells[8].isRevealed, true);
  assert.equal(cells[7].isRevealed, true);
});

test('flags cannot exceed the mine count and win needs all safe cells revealed', () => {
  const cells = core.createCells(2, 2);
  assert.equal(core.toggleFlag(cells, 0, 1), true);
  assert.equal(core.toggleFlag(cells, 1, 1), false);
  cells[0].isMine = true;
  cells[0].isFlagged = true;
  cells[1].isRevealed = true;
  cells[2].isRevealed = true;
  cells[3].isRevealed = true;
  assert.equal(core.isWin(cells), true);
});
