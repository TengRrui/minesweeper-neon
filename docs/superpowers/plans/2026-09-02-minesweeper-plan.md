# 扫雷游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `扫雷游戏` 目录中交付一个无需依赖、可直接打开的中文扫雷网页游戏。

**Architecture:** 使用原生 HTML/CSS/JavaScript。`src/game-core.js` 提供与 DOM 无关的棋盘规则，`script.js` 负责渲染和用户交互；棋盘使用 CSS Grid 中的 button 元素，因此桌面、触摸和键盘操作共用同一套状态。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 内置 `node:test`（仅用于规则单元测试）。

**Spec:** `docs/superpowers/specs/2026-09-02-minesweeper-design.md`

## Global Constraints

- 运行时不使用第三方包、外部 CDN、网络资源或构建步骤。
- 初级为 `9 × 9 / 10 雷`，中级为 `16 × 16 / 40 雷`，专家为 `30 × 16 / 99 雷`。
- 首个揭示格及其邻域不得生成地雷；计时从首个揭示动作开始。
- 右键用于标记，触摸设备使用独立标记模式；已结束局不再接受操作。
- `localStorage` 不可用时游戏仍必须可玩；动画遵循 `prefers-reduced-motion`。
- 核心操作、状态和提示文字使用简体中文；装饰性短标签可保留英文，代码和 DOM 事件保持清晰的小职责边界。

---

### Task 1: 建立可测试的扫雷规则核心

**Files:**
- Create: `src/game-core.js`
- Create: `tests/game-core.test.js`

**Interfaces:**
- Produces `window.MinesweeperCore` in the browser and `module.exports` in Node with `createCells(rows, cols)`, `getNeighbors(index, rows, cols)`, `placeMines(cells, rows, cols, mineCount, safeIndex, randomFn)`, `calculateAdjacencies(cells, rows, cols)`, `revealFrom(cells, rows, cols, startIndex)`, `toggleFlag(cells, index, mineCount)`, `countFlags(cells)`, `countRevealedSafe(cells)`, and `isWin(cells)`.
- Each cell has `{ index, isMine, isRevealed, isFlagged, adjacentMines }`; mutation functions return a small result object or mutate only the supplied cell array as documented in the module header.

- [x] **Step 1: Write the failing tests**

Create Node tests that prove the board shape, neighbor bounds, safe first move, adjacency counts, zero-area flood reveal, flag limit, and win condition. The tests must load the CommonJS export:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/game-core.js');

test('creates a rectangular board with stable indexes', () => {
  const cells = core.createCells(3, 4);
  assert.equal(cells.length, 12);
  assert.deepEqual(cells[0], {
    index: 0, isMine: false, isRevealed: false,
    isFlagged: false, adjacentMines: 0,
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
```

- [x] **Step 2: Run the tests and verify they fail**

Run `node --test tests/game-core.test.js` from `扫雷游戏`. Expected: FAIL because `src/game-core.js` does not exist yet.

- [x] **Step 3: Implement the minimum rules engine**

Implement the module as a browser/Node compatible IIFE. `placeMines` should build an exclusion set from `safeIndex` and its neighbors, shuffle eligible indexes with Fisher–Yates using the injectable random function, and set exactly `mineCount` cells to mines. `revealFrom` should use a stack, reveal the requested safe cell, and expand only zero-adjacent cells. `toggleFlag` should reject revealed cells and a new flag when `countFlags(cells) >= mineCount`; return `true` only when the flag state changed. Keep the functions deterministic under an injected random function.

- [x] **Step 4: Run the tests and syntax check**

Run `node --test tests/game-core.test.js` and `node --check src/game-core.js`. Expected: all tests pass and syntax check exits with code 0.

### Task 2: Build the semantic page shell

**Files:**
- Create: `index.html`

**Interfaces:**
- Provides the selectors used by `script.js`: `#difficulty`, `#new-game`, `#flag-mode`, `#mine-count`, `#timer`, `#best-time`, `#game-status`, `#board`, `#result-modal`, `#result-title`, `#result-copy`, `#play-again`, and `#live-region`.
- Loads `styles.css`, then `src/game-core.js`, then `script.js` with `defer`.

- [x] **Step 1: Add the page structure**

Create a single `lang="zh-CN"` document with a centered game shell, eyebrow/title/subtitle, difficulty select, new-game button, three compact stats, a board section, an inline status/live region, a mark-mode button for touch, keyboard/mouse help, and a modal result card. Use `button` for each runtime-created cell and keep the board wrapper labeled with `aria-label="扫雷棋盘"`.

- [x] **Step 2: Verify the static shell**

Run `node --check` only after Task 3 supplies JavaScript; before that, inspect the document for matching IDs and confirm that opening `index.html` has no missing stylesheet/script paths.

### Task 3: Add the responsive visual system

**Files:**
- Create: `styles.css`

**Interfaces:**
- Styles the IDs and classes emitted by `index.html` and `script.js`, including `.cell`, `.cell.is-revealed`, `.cell.is-flagged`, `.cell.is-mine`, `.cell.is-wrong-flag`, `.cell--n1` through `.cell--n8`, `.is-active`, and `.is-hidden`.

- [x] **Step 1: Implement the desktop layout and theme**

Use a dark navy background with warm off-white text, cyan and coral accents, rounded panels, subtle grid/noise-like gradients made only with CSS, and a responsive board. Set `.board` to `display: grid`; JavaScript supplies `--columns` and each difficulty uses a square cell size that can shrink without breaking the expert board.

- [x] **Step 2: Implement cell and result states**

Give hidden cells a raised surface, revealed cells a sunken surface, flags a clear flag glyph/color, mines a coral warning, wrong flags a crossed warning, and numbers distinct accessible colors. Add short reveal/result animations, focus-visible outlines, disabled-state styling, and an `@media (prefers-reduced-motion: reduce)` block that disables animation.

- [x] **Step 3: Add narrow-screen rules**

At widths below 680px, stack controls, let the board scroll only within its own wrapper if expert mode is wider than the device, reduce padding and typography, and ensure the page itself does not create horizontal overflow.

### Task 4: Connect the rules to the interactive game

**Files:**
- Create: `script.js`

**Interfaces:**
- Consumes `window.MinesweeperCore` and the selectors from Task 2.
- Produces a fully playable game with `ready`, `playing`, `won`, and `lost` statuses, current difficulty, timer text, and result modal.

- [x] **Step 1: Add configuration and state initialization**

Define the three exact difficulty records, create a fresh `cells` array on `newGame`, set `firstMove = true`, clear the timer, reset flag count and status, set `board.style.setProperty('--columns', cols)`, and render all cells as hidden buttons. Read the saved best time in a guarded `try/catch`.

- [x] **Step 2: Implement reveal flow with first-click protection**

On a normal reveal, ignore flagged/revealed/finished cells. For the first click, call `placeMines(cells, rows, cols, mineCount, index)`, calculate adjacencies, switch status to `playing`, start one interval, then call `revealFrom`. Update `revealedSafeCells` from the cell array and test `isWin` after every action.

- [x] **Step 3: Implement flags, chord reveal, and input modes**

Attach click, contextmenu, and double-click handlers using event delegation. A right click toggles a flag and prevents the browser context menu; double-click on a revealed number flags eligible neighbors and reveals neighbors when its flag count matches the number. The mark-mode button toggles `.is-active` and causes normal clicks to toggle flags on touch devices. Keyboard handlers support Enter/Space to reveal, `f` to flag, and `r` to reset.

- [x] **Step 4: Implement loss, win, timer, and persistence**

On a mine reveal, stop the interval, reveal all mines, add `.is-wrong-flag` to incorrectly flagged cells, set status to `lost`, and show the result modal. On win, stop the interval, flag remaining mines, save a lower best time per difficulty in guarded `localStorage`, and show the success modal. Cap the visible timer at 999 seconds and keep the counter as `mineCount - flagsUsed`.

- [x] **Step 5: Implement accessible rendering**

For every cell update text and classes from state, set `aria-label` to a Chinese description (hidden, flagged, mine, or adjacent count), set `aria-pressed` to the revealed state, and move focus back to the clicked cell after a rerender. Send concise status messages to `#live-region` and make the modal close/replay flow keyboard usable.

- [x] **Step 6: Run static checks**

Run `node --check script.js`, `node --check src/game-core.js`, and `node --test tests/game-core.test.js`. Expected: syntax checks pass and all rule tests remain green.

### Task 5: Document usage and verify the delivered game

**Files:**
- Create: `README.md`

**Interfaces:**
- Documents the direct-open entrypoint, controls, three difficulty settings, first-click protection, win/loss behavior, and the test command.

- [x] **Step 1: Write the user-facing README**

Explain that users can double-click `index.html`; list left click, right click, mark mode, double-click, and keyboard controls; state the goal and difficulty table; mention that best times are local to the browser.

- [x] **Step 2: Perform browser smoke checks**

Serve the folder with `python -m http.server 8765`, open `http://127.0.0.1:8765/`, and verify: initial board is visible; switching difficulties changes dimensions; first click never loses; right-click places/removes a flag; flag count never goes below zero; reset clears the board and timer; a deliberately opened mine shows the loss modal; a board with all safe cells revealed shows the win modal; no console errors appear.

- [x] **Step 3: Perform final repository checks**

Run `rg --files .`, `node --test tests/game-core.test.js`, `node --check src/game-core.js`, and `node --check script.js`. Confirm all files remain under `扫雷游戏`, no external URLs are required, and the README points to the correct entrypoint.
