(function attachCore(root, factory) {
  const core = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  } else {
    root.MinesweeperCore = core;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCore() {
  function createCells(rows, cols) {
    return Array.from({ length: rows * cols }, (_, index) => ({
      index,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }));
  }

  function getNeighbors(index, rows, cols) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;

        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) continue;

        neighbors.push(nextRow * cols + nextCol);
      }
    }

    return neighbors;
  }

  function countFlags(cells) {
    return cells.reduce((count, cell) => count + (cell.isFlagged ? 1 : 0), 0);
  }

  function countRevealedSafe(cells) {
    return cells.reduce((count, cell) => (
      count + (cell.isRevealed && !cell.isMine ? 1 : 0)
    ), 0);
  }

  function placeMines(cells, rows, cols, mineCount, safeIndex, randomFn = Math.random) {
    const excluded = new Set([safeIndex, ...getNeighbors(safeIndex, rows, cols)]);
    const eligibleIndexes = cells
      .filter((cell) => !excluded.has(cell.index))
      .map((cell) => cell.index);
    const random = typeof randomFn === 'function' ? randomFn : Math.random;

    for (let index = eligibleIndexes.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [eligibleIndexes[index], eligibleIndexes[swapIndex]] = [
        eligibleIndexes[swapIndex],
        eligibleIndexes[index],
      ];
    }

    for (const cell of cells) cell.isMine = false;
    for (const index of eligibleIndexes.slice(0, mineCount)) {
      cells[index].isMine = true;
    }
  }

  function calculateAdjacencies(cells, rows, cols) {
    for (const cell of cells) cell.adjacentMines = 0;

    for (const cell of cells) {
      if (!cell.isMine) continue;
      for (const neighborIndex of getNeighbors(cell.index, rows, cols)) {
        cells[neighborIndex].adjacentMines += 1;
      }
    }
  }

  function revealFrom(cells, rows, cols, startIndex) {
    const startCell = cells[startIndex];
    if (!startCell || startCell.isMine || startCell.isFlagged || startCell.isRevealed) return [];

    const revealedIndexes = [];
    const pending = [startIndex];
    const visited = new Set();

    while (pending.length > 0) {
      const index = pending.pop();
      if (visited.has(index)) continue;
      visited.add(index);

      const cell = cells[index];
      if (!cell || cell.isMine || cell.isFlagged || cell.isRevealed) continue;

      cell.isRevealed = true;
      revealedIndexes.push(index);

      if (cell.adjacentMines !== 0) continue;
      for (const neighborIndex of getNeighbors(index, rows, cols)) {
        if (!visited.has(neighborIndex)) pending.push(neighborIndex);
      }
    }

    return revealedIndexes;
  }

  function toggleFlag(cells, index, mineCount) {
    const cell = cells[index];
    if (!cell || cell.isRevealed) return false;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      return true;
    }

    if (countFlags(cells) >= mineCount) return false;
    cell.isFlagged = true;
    return true;
  }

  function isWin(cells) {
    return cells.length > 0 && cells.every((cell) => cell.isMine || cell.isRevealed);
  }

  return {
    calculateAdjacencies,
    countFlags,
    countRevealedSafe,
    createCells,
    getNeighbors,
    isWin,
    placeMines,
    revealFrom,
    toggleFlag,
  };
}));
