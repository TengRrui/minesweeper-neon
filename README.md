# 扫雷 · Neon Mines

一个无需安装、无需构建、双击即可运行的中文扫雷游戏。所有代码都是原生 HTML、CSS 和 JavaScript，不依赖网络或第三方库。

## 运行

直接双击打开 [index.html](./index.html)，或在这个目录中启动本地静态服务器：

```powershell
python -m http.server 8765
```

然后访问 `http://127.0.0.1:8765/`。

## 玩法

- 左键点击或按 `Enter` / `Space`：揭示格子。
- 右键点击或按 `F`：插旗 / 取消插旗。
- 点击“标记模式”后，普通点击也会插旗，适合触摸屏。
- 双击已揭示的数字格：当周围旗帜数量匹配数字时，快速揭示邻格；数量不匹配时会提示当前状态。
- 方向键、`Home`、`End`：移动当前格子的键盘焦点。
- 按 `R` 或点击“新游戏”：重新开始当前难度。

首击及其周围区域不会生成地雷。目标是揭示所有安全格；踩到地雷会结束本局。计时从首个揭示动作开始。

| 难度 | 棋盘 | 地雷 |
| --- | ---: | ---: |
| 初级 | 9 × 9 | 10 |
| 中级 | 16 × 16 | 40 |
| 专家 | 30 × 16 | 99 |

最佳用时只保存在当前浏览器的 `localStorage` 中；即使浏览器禁用本地存储，游戏也可以正常游玩。

## 开发检查

规则核心有一组 Node.js 内置测试，不需要安装依赖：

```powershell
node --test tests/game-core.test.js
node --check src/game-core.js
node --check script.js
```

## 文件结构

```text
扫雷游戏/
├── index.html
├── styles.css
├── script.js
├── src/
│   └── game-core.js
├── tests/
│   └── game-core.test.js
└── docs/superpowers/
    ├── specs/2026-09-02-minesweeper-design.md
    └── plans/2026-09-02-minesweeper-plan.md
```
