# 开发者文档（Development）

本文档面向**开发者/贡献者**：如何构建、测试、打包。面向用户的说明见 [README.md](../README.md)。

## 目录结构

```
demo-03/
├── package.json        # electron 依赖 + electron-builder 打包配置
├── src/
│   ├── main.js         # Electron 主进程：窗口、boot screen 状态机、生命周期、清理
│   ├── preload.js      # boot screen 与主进程的 IPC 桥（contextBridge）
│   ├── boot.html       # 启动器页面（检测 / 一键启动 / 重试）
│   ├── config.js       # 配置与 dsh 启动器解析（env 可覆盖）
│   ├── server.js       # 探测 / spawn / 就绪解析 / 停止服务
│   └── server.test.js  # 单元测试（不依赖 Electron）
├── scripts/
│   └── afterPack.js    # 打包时裁剪 Electron 语言包
└── docs/
    ├── DEVELOPMENT.md  # 本文档
    └── tauri-migration.md  # Tauri 迁移工作量评估
```

## 运行（开发）

前置：仓库已构建（`pnpm run build`，否则 spawn 模式会失败）。

```sh
npm install        # 首次：安装 electron
npm start          # 启动壳
```

启动器解析优先级（spawn 模式用）：

| 优先级 | 方式 | 场景 |
|---|---|---|
| 1 | `$DSH_BIN` | 打包安装：指向 `dsh` 可执行文件 |
| 2 | PATH 里的 `dsh` | 全局安装 |
| 3 | `pnpm dsh`（仓库根目录） | 源码检出（默认，自动定位 `demo/demo-03` 上两级） |

## 环境变量

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_SHELL_PORT` | `3080` | 探测端口（connect 模式） |
| `DSH_SHELL_TIMEOUT` | `120000` | spawn 就绪等待上限（ms） |
| `DSH_SHELL_AUTO_START` | `1` | 探测失败后自动启动服务；设 `0` 则只显示「一键启动服务」按钮，等用户点击 |
| `DSH_BIN` | — | 显式指定 `dsh` 可执行文件路径 |
| `DSH_REPO_ROOT` | 自动 | 源码检出时的仓库根目录 |

## 验证

```sh
npm test                    # 单元测试（不需要 Electron）
npm start -- --screenshot   # 渲染 GUI 后截图到 ./shell-screenshot.png 并退出
npm start -- --screenshot --keep-open   # 截图后保持窗口打开
```

## 打包（macOS / Windows）

```sh
npm run dist        # 当前平台产物：macOS → dmg，Windows → NSIS
```

`electron-builder` 配置已在 `package.json` 的 `build` 字段中；未签名构建（本机自用）加 `CSC_IDENTITY_AUTO_DISCOVERY=false`。

### 体积优化（已内置）

`scripts/afterPack.js` 在打包时自动裁剪 Electron 自带的语言包（220 个 `.lproj` / 55 个 `.pak`，共 ~47MB），只保留中英文。实测收益：

| 产物 | 裁剪前 | 裁剪后 |
|---|---|---|
| macOS dmg | 114MB | 103MB |
| win64 zip | 133MB | 123MB |

剩余 ~100MB+ 是 Electron 运行时本体（Chromium + Node + V8 + ICU，主二进制 ~200MB 解压），压缩率已到极限——想低于 ~30MB 只能换技术路线（见下文）。

### 体积地板与更激进的路线

| 方案 | 安装包体积 | 代价 |
|---|---|---|
| 当前 Electron 壳 | dmg 103MB / zip 123MB | 已到 Electron 地板 |
| Electron + electron-updater | 首装不变，**后续更新只下差量（几 MB）** | 加发布服务器/签名 |
| Tauri（系统 WebView + Rust） | 5–15MB | 主进程重写为 Rust，spawn/探测/启动器页面逻辑可平移（[迁移评估](tauri-migration.md)） |
| 原生 WebView 壳（Swift/C#） | ~1MB | 两套代码库（WKWebView + WebView2） |

## Windows（win64）支持现状

**代码层已兼容；win64 便携 zip 已在 macOS 上交叉构建成功**（产物 `dist/dsh-web-desktop-shell-0.1.0-win.zip`，内含 PE32+ x86-64 exe）；但**运行时行为尚未在 Windows 上实测**（本仓库只在 macOS 上开发验证过）。已做的兼容处理：

- win32 下所有 spawn 走 `shell: true`，兼容 `pnpm.cmd` / `dsh.cmd` shim；`commandOnPath` 用 `where` 探测；
- 进程树清理：win32 用 `taskkill /pid <pid> /t /f` 杀整棵进程树（`child.kill()` 在 Windows 只是强杀直接子进程，pnpm → node 的孙进程会残留成孤儿）；
- 打包配置：`win.target: nsis`。

**在 Windows 上运行**（需要 Windows 机器，Node 22+）：

```sh
npm install
npm start            # 直接跑；或先全局安装 dsh 后运行
```

**交叉构建 win64 便携 zip（macOS 上可行，无需 wine）**——跳过 resedit（图标/元数据编辑，需 wine），用本地 win32-x64 electron zip：

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win zip --x64 \
  -c.electronDist=/tmp/electron-v43.4.0-win32-x64.zip \
  -c.win.signAndEditExecutable=false
```

注意：`signAndEditExecutable=false` 时 exe 保留默认文件名（`dsh-web-desktop-shell.exe`），且无图标/版本元数据。

**NSIS 安装包**（`npm run dist` 在 Windows 上产出 `*-setup.exe`）必须在 Windows 上构建——macOS 交叉构建 NSIS 需要 wine，不推荐。

**Windows 特有风险（未实测，建议首跑验证）**：

| 风险点 | 说明 |
|---|---|
| spawn 引号 | `shell: true` + 参数数组在 cmd 下的拼接行为，需要实机确认（当前参数都是简单 token，风险低） |
| dsh 安装形态 | 用户机器上 dsh 可能是 `dsh.exe` / `dsh.cmd` / 未安装——未安装时 boot screen 会给出指引（设置 `DSH_BIN`） |
| taskkill 清理 | 进程树强杀路径已写，但 Windows 上退出时的实际表现需实机验证 |

## 设计要点

- **只绑本机**：harness 默认只监听 `127.0.0.1`，且源码显式拒绝 `--host 0.0.0.0`（安全红线）。本壳只能做本机客户端。
- **连已有实例时**：壳不会杀掉它（`child: null`，只读连接）；只有自己 spawn 的服务才会在退出时被清理。
- **Windows spawn**：win32 下所有 spawn 走 `shell: true`，自动兼容 `pnpm.cmd` / `dsh.cmd`。
