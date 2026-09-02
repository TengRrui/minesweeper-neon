(() => {
  'use strict';

  const core = window.MinesweeperCore;
  const DIFFICULTIES = {
    beginner: {
      label: '初级',
      rows: 9,
      cols: 9,
      mineCount: 10,
    },
    intermediate: {
      label: '中级',
      rows: 16,
      cols: 16,
      mineCount: 40,
    },
    expert: {
      label: '专家',
      rows: 16,
      cols: 30,
      mineCount: 99,
    },
  };

  const STATUS_TEXT = {
    ready: '准备开始',
    playing: '扫描中',
    won: '区域已清空',
    lost: '触发地雷',
  };

  const refs = {
    board: document.querySelector('#board'),
    boardSize: document.querySelector('#board-size'),
    bestTime: document.querySelector('#best-time'),
    difficulty: document.querySelector('#difficulty'),
    flagMode: document.querySelector('#flag-mode'),
    gameStatus: document.querySelector('#game-status'),
    liveRegion: document.querySelector('#live-region'),
    mineCount: document.querySelector('#mine-count'),
    modal: document.querySelector('#result-modal'),
    modalCard: document.querySelector('.modal-card'),
    newGame: document.querySelector('#new-game'),
    playAgain: document.querySelector('#play-again'),
    resultCopy: document.querySelector('#result-copy'),
    resultIcon: document.querySelector('#result-icon'),
    resultKicker: document.querySelector('#result-kicker'),
    resultTitle: document.querySelector('#result-title'),
    statusText: document.querySelector('#status-text'),
    timer: document.querySelector('#timer'),
  };

  const state = {
    cells: [],
    difficultyKey: 'beginner',
    elapsedSeconds: 0,
    firstMove: true,
    flagsUsed: 0,
    lastFocusedIndex: null,
    markMode: false,
    status: 'ready',
    timerId: null,
    startedAt: 0,
  };

  function currentConfig() {
    return DIFFICULTIES[state.difficultyKey];
  }

  function formatTimer(seconds) {
    return String(Math.min(999, Math.max(0, seconds))).padStart(3, '0');
  }

  function getBestTime(key = state.difficultyKey) {
    try {
      const saved = Number.parseInt(window.localStorage.getItem(`neon-mines-best-${key}`), 10);
      return Number.isFinite(saved) && saved >= 0 ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveBestTime() {
    const previous = getBestTime();
    const isNewBest = previous === null || state.elapsedSeconds < previous;
    if (!isNewBest) return false;

    try {
      window.localStorage.setItem(
        `neon-mines-best-${state.difficultyKey}`,
        String(state.elapsedSeconds),
      );
    } catch (error) {
      return false;
    }
    return true;
  }

  function updateBestTime() {
    const best = getBestTime();
    refs.bestTime.textContent = best === null ? '—' : formatTimer(best);
  }

  function setGameStatus(status) {
    state.status = status;
    refs.gameStatus.dataset.status = status;
    refs.statusText.textContent = STATUS_TEXT[status];
  }

  function announce(message) {
    refs.liveRegion.textContent = message;
  }

  function syncStats() {
    const config = currentConfig();
    state.flagsUsed = core.countFlags(state.cells);
    refs.mineCount.textContent = String(config.mineCount - state.flagsUsed);
    refs.timer.textContent = formatTimer(state.elapsedSeconds);
    updateBestTime();
  }

  function stopTimer() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimer() {
    if (state.status !== 'playing') return;
    state.elapsedSeconds = Math.min(999, Math.floor((Date.now() - state.startedAt) / 1000));
    refs.timer.textContent = formatTimer(state.elapsedSeconds);
  }

  function startTimer() {
    stopTimer();
    state.startedAt = Date.now();
    state.timerId = window.setInterval(updateTimer, 250);
  }

  function cellPosition(index) {
    const config = currentConfig();
    return {
      col: (index % config.cols) + 1,
      row: Math.floor(index / config.cols) + 1,
    };
  }

  function getCellLabel(cell) {
    const position = cellPosition(cell.index);
    const location = `第 ${position.row} 行，第 ${position.col} 列`;

    if (state.status === 'lost' && cell.isMine) return `${location}，地雷`;
    if (state.status === 'lost' && cell.isFlagged && !cell.isMine) {
      return `${location}，错误标记`;
    }
    if (cell.isFlagged) return `${location}，已标记`;
    if (!cell.isRevealed) return `${location}，未揭示`;
    if (cell.isMine) return `${location}，地雷`;
    if (cell.adjacentMines === 0) return `${location}，安全，周围没有地雷`;
    return `${location}，已揭示，周围有 ${cell.adjacentMines} 颗地雷`;
  }

  function renderCell(cell) {
    const button = refs.board.querySelector(`[data-index="${cell.index}"]`);
    if (!button) return;

    const revealMine = state.status === 'lost' && cell.isMine;
    const wrongFlag = state.status === 'lost' && cell.isFlagged && !cell.isMine;
    const isRevealed = cell.isRevealed || revealMine;

    button.className = 'cell';
    button.textContent = '';
    button.dataset.index = String(cell.index);
    button.setAttribute('aria-label', getCellLabel(cell));
    button.setAttribute('aria-pressed', String(isRevealed));
    button.setAttribute('aria-rowindex', String(cellPosition(cell.index).row));
    button.setAttribute('aria-colindex', String(cellPosition(cell.index).col));

    if (isRevealed) button.classList.add('is-revealed');
    if (wrongFlag) {
      button.classList.add('is-wrong-flag');
      button.textContent = '×';
      return;
    }
    if (cell.isFlagged) {
      button.classList.add('is-flagged');
      button.textContent = '⚑';
      return;
    }
    if (revealMine) {
      button.classList.add('is-mine');
      button.textContent = '✹';
      return;
    }
    if (cell.isRevealed && cell.adjacentMines > 0) {
      button.classList.add(`cell--n${cell.adjacentMines}`);
      button.textContent = String(cell.adjacentMines);
    }
  }

  function renderBoard() {
    for (const cell of state.cells) renderCell(cell);
    syncStats();
  }

  function createBoardButtons() {
    const config = currentConfig();
    const fragment = document.createDocumentFragment();
    refs.board.innerHTML = '';
    refs.board.style.setProperty('--columns', String(config.cols));
    refs.board.dataset.difficulty = state.difficultyKey;
    refs.board.setAttribute('aria-rowcount', String(config.rows));
    refs.board.setAttribute('aria-colcount', String(config.cols));

    for (const cell of state.cells) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.index = String(cell.index);
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-pressed', 'false');
      fragment.appendChild(button);
    }
    refs.board.appendChild(fragment);
  }

  function closeModal(restoreFocus = true) {
    refs.modal.hidden = true;
    refs.modalCard.removeAttribute('data-result');
    if (restoreFocus && state.lastFocusedIndex !== null) {
      const previous = refs.board.querySelector(`[data-index="${state.lastFocusedIndex}"]`);
      if (previous) previous.focus({ preventScroll: true });
    }
  }

  function showModal(result, copy) {
    const won = result === 'won';
    refs.modalCard.dataset.result = result;
    refs.resultIcon.textContent = won ? '✦' : '×';
    refs.resultKicker.textContent = won ? 'SCAN COMPLETE' : 'SCAN ABORTED';
    refs.resultTitle.textContent = won ? '区域已清空' : '触发地雷';
    refs.resultCopy.textContent = copy;
    refs.modal.hidden = false;
    refs.playAgain.focus({ preventScroll: true });
  }

  function rememberFocus(index) {
    state.lastFocusedIndex = index;
  }

  function finishLoss() {
    stopTimer();
    for (const cell of state.cells) {
      if (cell.isMine) cell.isRevealed = true;
    }
    setGameStatus('lost');
    renderBoard();
    announce('扫描中止：触发了一枚地雷。');
    showModal('lost', `你用时 ${state.elapsedSeconds} 秒，错误标记会在棋盘上显示。`);
  }

  function finishWin() {
    stopTimer();
    for (const cell of state.cells) {
      if (cell.isMine) cell.isFlagged = true;
    }
    const newBest = saveBestTime();
    setGameStatus('won');
    renderBoard();
    announce('扫描完成：所有安全格都已揭示。');
    const recordCopy = newBest ? '新的本地最佳记录已保存。' : '所有安全格都已确认。';
    showModal('won', `你用时 ${state.elapsedSeconds} 秒。${recordCopy}`);
  }

  function checkWin() {
    if (core.isWin(state.cells)) {
      finishWin();
      return true;
    }
    return false;
  }

  function revealCell(index) {
    if (state.status === 'won' || state.status === 'lost') return;
    const cell = state.cells[index];
    if (!cell || cell.isRevealed || cell.isFlagged) return;

    rememberFocus(index);
    const config = currentConfig();
    if (state.firstMove) {
      core.placeMines(state.cells, config.rows, config.cols, config.mineCount, index);
      core.calculateAdjacencies(state.cells, config.rows, config.cols);
      state.firstMove = false;
      setGameStatus('playing');
      startTimer();
    }

    if (state.cells[index].isMine) {
      finishLoss();
      return;
    }

    core.revealFrom(state.cells, config.rows, config.cols, index);
    renderBoard();
    if (checkWin()) return;

    announce(`已揭示 ${core.countRevealedSafe(state.cells)} 个安全格。`);
    focusCell(index);
  }

  function toggleFlag(index) {
    if (state.status === 'won' || state.status === 'lost') return;
    const config = currentConfig();
    rememberFocus(index);
    const changed = core.toggleFlag(state.cells, index, config.mineCount);
    if (!changed) {
      if (core.countFlags(state.cells) >= config.mineCount) {
        announce('旗帜数量已达到本局地雷数。');
      }
      return;
    }

    renderBoard();
    const cell = state.cells[index];
    announce(cell.isFlagged ? '已标记该格。' : '已取消标记。');
    focusCell(index);
  }

  function chordCell(index) {
    if (state.status !== 'playing') return;
    const config = currentConfig();
    const cell = state.cells[index];
    if (!cell || !cell.isRevealed || cell.adjacentMines === 0) return;

    rememberFocus(index);
    const neighbors = core.getNeighbors(index, config.rows, config.cols);
    const flaggedCount = neighbors.reduce(
      (count, neighborIndex) => count + (state.cells[neighborIndex].isFlagged ? 1 : 0),
      0,
    );

    if (flaggedCount !== cell.adjacentMines) {
      announce(`周围需要 ${cell.adjacentMines} 面旗帜，目前有 ${flaggedCount} 面。`);
      return;
    }

    const hiddenNeighbors = neighbors.filter((neighborIndex) => {
      const neighbor = state.cells[neighborIndex];
      return !neighbor.isRevealed && !neighbor.isFlagged;
    });
    if (hiddenNeighbors.some((neighborIndex) => state.cells[neighborIndex].isMine)) {
      finishLoss();
      return;
    }

    for (const neighborIndex of hiddenNeighbors) {
      core.revealFrom(state.cells, config.rows, config.cols, neighborIndex);
    }
    renderBoard();
    if (checkWin()) return;
    announce(`快速扫描完成，已揭示 ${core.countRevealedSafe(state.cells)} 个安全格。`);
    focusCell(index);
  }

  function focusCell(index) {
    const button = refs.board.querySelector(`[data-index="${index}"]`);
    if (button && document.activeElement !== button) button.focus({ preventScroll: true });
  }

  function moveFocus(index, direction) {
    const config = currentConfig();
    const row = Math.floor(index / config.cols);
    const col = index % config.cols;
    let nextRow = row;
    let nextCol = col;

    if (direction === 'up') nextRow -= 1;
    if (direction === 'down') nextRow += 1;
    if (direction === 'left') nextCol -= 1;
    if (direction === 'right') nextCol += 1;
    if (direction === 'home') {
      nextRow = row;
      nextCol = 0;
    }
    if (direction === 'end') {
      nextRow = row;
      nextCol = config.cols - 1;
    }

    nextRow = Math.max(0, Math.min(config.rows - 1, nextRow));
    nextCol = Math.max(0, Math.min(config.cols - 1, nextCol));
    focusCell(nextRow * config.cols + nextCol);
  }

  function handleBoardKeydown(event) {
    const button = event.target.closest('.cell');
    if (!button) return;
    const index = Number(button.dataset.index);

    const navigation = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Home: 'home',
      End: 'end',
    };
    if (navigation[event.key]) {
      event.preventDefault();
      moveFocus(index, navigation[event.key]);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (state.markMode) toggleFlag(index);
      else revealCell(index);
      return;
    }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFlag(index);
    }
  }

  function newGame(focusBoard = false) {
    stopTimer();
    closeModal(false);
    state.difficultyKey = refs.difficulty.value;
    const config = currentConfig();
    state.cells = core.createCells(config.rows, config.cols);
    state.elapsedSeconds = 0;
    state.firstMove = true;
    state.flagsUsed = 0;
    state.lastFocusedIndex = null;
    setGameStatus('ready');
    refs.boardSize.textContent = `${config.cols} × ${config.rows}`;
    createBoardButtons();
    renderBoard();
    announce('点击任意格开始扫描，首击不会踩雷。');
    if (focusBoard) focusCell(0);
  }

  refs.board.addEventListener('click', (event) => {
    const button = event.target.closest('.cell');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (state.markMode) toggleFlag(index);
    else revealCell(index);
  });

  refs.board.addEventListener('contextmenu', (event) => {
    const button = event.target.closest('.cell');
    if (!button) return;
    event.preventDefault();
    toggleFlag(Number(button.dataset.index));
  });

  refs.board.addEventListener('dblclick', (event) => {
    const button = event.target.closest('.cell');
    if (button) chordCell(Number(button.dataset.index));
  });

  refs.board.addEventListener('keydown', handleBoardKeydown);
  refs.difficulty.addEventListener('change', () => newGame());
  refs.newGame.addEventListener('click', () => newGame());
  refs.flagMode.addEventListener('click', () => {
    state.markMode = !state.markMode;
    refs.flagMode.classList.toggle('is-active', state.markMode);
    refs.flagMode.setAttribute('aria-pressed', String(state.markMode));
    announce(state.markMode ? '标记模式已开启，点击格子即可插旗。' : '标记模式已关闭。');
  });
  refs.playAgain.addEventListener('click', () => newGame(true));
  refs.modal.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal="true"]')) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    const tagName = event.target.tagName.toLowerCase();
    if (event.key.toLowerCase() === 'r' && tagName !== 'input' && tagName !== 'select' && tagName !== 'textarea') {
      event.preventDefault();
      newGame();
    }
    if (event.key === 'Escape' && !refs.modal.hidden) closeModal();
  });

  newGame();
})();
