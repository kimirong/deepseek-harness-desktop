# dsh-web-desktop-shell

一个极简的 Electron 桌面壳：**启动（或连接）本机 `dsh web` 服务，然后在原生窗口里显示 DeepSeek Harness Web GUI**。

壳本身不渲染任何 UI 逻辑——它只负责三件事：

1. **探测**：`127.0.0.1:3080` 上是否已有正在运行的 harness 实例（通过 index.html 里的 `__DSH_BOOT__` 注入标记识别，避免误连其他程序）。
2. **启动或连接**：
   - 已有实例 → 直接连接（`mode=connect`），**不**再起一个服务；
   - 没有实例 → 显示**启动器页面**：自动（或点击「一键启动服务」）spawn 一个 `dsh web --port 0`（端口由系统分配，无冲突），解析就绪行 `dsh web: http://127.0.0.1:<port>`；
   - 启动失败 / 找不到 dsh → 错误显示在启动器页面里（可重试、可重新检测），**不会弹窗退出**。
3. **清理**：窗口关闭时对 spawn 出来的服务发 `SIGTERM`（5 秒后升级 `SIGKILL`），不留孤儿进程。

> 为什么必须连后端：前端不是独立静态站，只有 `dsh web` 会往 index.html 注入 `window.__DSH_BOOT__` 并动态 serve 插件 bundle。壳永远不能离线加载静态文件。

## 发行状态

**v0.1.0（2026-08-14）**

- ✅ **macOS（Apple Silicon, arm64）**：已发布，安装包 `DeepSeek Harness-0.1.0-arm64.dmg`（见 GitHub Releases）。
- ⚠️ **Windows（win64）**：**尚未验证、未发布**。代码层已做 win32 兼容（`shell: true`、`taskkill /T` 进程树清理、NSIS 配置），并已在 macOS 上交叉构建出 win64 便携 zip 验证打包链路；但**运行时行为未在 Windows 真机实测**，故本发行版不包含 Windows 安装包。详见下文 [Windows（win64）支持现状](#windowswin64-支持现状)。

## 一起协作 🤝

欢迎各位朋友来一起协作完善这个项目！无论是修复 bug、补充功能、完善文档，还是帮我们在 **Windows / Linux 真机上做验证**（目前仅 macOS 验证过），都非常欢迎。

请通过 [GitHub Issues](https://github.com/kimirong/deepseek-harness-desktop/issues) 提出建议或反馈问题，也可以直接提交 Pull Request。

## 启动器页面（boot screen）

窗口首屏是一个本地状态页（`src/boot.html`），处理"服务没启动"的所有情况：

| 场景 | 页面表现 |
|---|---|
| 探测到已有实例 | 自动跳转 GUI（无感） |
| 没有实例，有 dsh | 自动启动（进度提示）；或点「一键启动服务」 |
| 启动失败 | 页面显示错误详情 + 「重试启动」+「重新检测」，不退出 |
| 找不到 dsh | 页面给出配置指引（全局安装 dsh 或设置 `DSH_BIN`）+「重新检测」 |
| 服务运行中意外退出 | 回到启动器页面显示「服务已退出」+ 重试 |

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
└── README.md
```

## 运行

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

### 网络坑（实测踩过，务必看）

electron-builder 每次构建都会重新下载两个产物，走代理（如 Clash）时连接经常在 TLS 握手或传输中途被断，构建报
`Client network socket disconnected before secure TLS connection was established`：

| 产物 | 缓存位置 | 规避 |
|---|---|---|
| electron zip（~120MB） | `~/Library/Caches/electron-builder/downloads/<sha256>/` | 见下方 `electronDist` 覆盖 |
| dmgbuild-bundle（22MB） | `~/Library/Caches/electron-builder/dmg-builder@1.2.5/` | 手动下载后放进去，自动校验 SHA256 |

**离线构建命令（推荐）**——先手动下载两个产物并放入缓存（可用 `https://registry.npmmirror.com/-/binary/...`，GitHub 直连在国内很慢），然后：

```sh
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
CSC_IDENTITY_AUTO_DISCOVERY=false \
npx electron-builder --mac dmg \
  -c.electronDist="$HOME/Library/Caches/electron-builder/downloads/<sha256>/electron-v<版本>-darwin-arm64.zip"
```

`electronDist` 指向本地 zip 后，打包全程零网络。dmgbuild 产物校验和可从 `node_modules/dmg-builder/out/dmgUtil.js` 查到。

### 体积优化（已内置）

`scripts/afterPack.js` 在打包时自动裁剪 Electron 自带的语言包（220 个 `.lproj` / 55 个 `.pak`，共 ~47MB），只保留中英文。实测收益：

| 产物 | 裁剪前 | 裁剪后 |
|---|---|---|
| macOS dmg | 114MB | 103MB |
| win64 zip | 133MB | 123MB |

剩余 ~100MB+ 是 Electron 运行时本体（Chromium + Node + V8 + ICU，主二进制 ~200MB 解压），压缩率已到极限——**想低于 ~30MB 只能换技术路线**（Tauri 或系统 WebView 壳，详见下节）。

### 体积地板与更激进的路线

| 方案 | 安装包体积 | 代价 |
|---|---|---|
| 当前 Electron 壳 | dmg 103MB / zip 123MB | 已到 Electron 地板 |
| Electron + electron-updater | 首装不变，**后续更新只下差量（几 MB）** | 加发布服务器/签名 |
| Tauri（系统 WebView + Rust） | 5–15MB | 主进程重写为 Rust，spawn/探测/启动器页面逻辑可平移 |
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
# 先下载 https://registry.npmmirror.com/-/binary/electron/v43.4.0/electron-v43.4.0-win32-x64.zip
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win zip --x64 \
  -c.electronDist=/tmp/electron-v43.4.0-win32-x64.zip \
  -c.win.signAndEditExecutable=false
```

注意：`signAndEditExecutable=false` 时 exe 保留默认文件名（`dsh-web-desktop-shell.exe`），且无图标/版本元数据。

**NSIS 安装包**（`npm run dist` 在 Windows 上产出 `*-setup.exe`）必须在 Windows 上构建——macOS 交叉构建 NSIS 需要 wine，不推荐。

Windows 网络坑与 macOS 相同：electron-builder 会下载 `electron-v<版本>-win32-x64.zip`（约 100MB），代理不稳时同样用
`-c.electronDist=<本地zip>` 离线方案；缓存位置是 `%LOCALAPPDATA%\electron-builder\Cache`。

**Windows 特有风险（未实测，建议首跑验证）**：

| 风险点 | 说明 |
|---|---|
| spawn 引号 | `shell: true` + 参数数组在 cmd 下的拼接行为，需要实机确认（当前参数都是简单 token，风险低） |
| dsh 安装形态 | 用户机器上 dsh 可能是 `dsh.exe` / `dsh.cmd` / 未安装——未安装时 boot screen 会给出指引（设置 `DSH_BIN`） |
| 代理软件 | Windows 常见代理（Clash for Windows 等）同样可能劫持 loopback，`<-loopback>` 绕过已内置 |
| taskkill 清理 | 进程树强杀路径已写，但 Windows 上退出时的实际表现需实机验证 |

## 注意事项

- **只绑本机**：harness 默认只监听 `127.0.0.1`，且源码显式拒绝 `--host 0.0.0.0`（安全红线）。本壳只能做本机客户端。
- **代理**：环境里的 `http_proxy`（如 Clash 7897）会把 loopback 请求变成 502；主进程已加 `--proxy-bypass-list=<-loopback>` 规避。
- **Windows spawn**：win32 下所有 spawn 走 `shell: true`，自动兼容 `pnpm.cmd` / `dsh.cmd`。
- **连已有实例时**：壳不会杀掉它（`child: null`，只读连接）；只有自己 spawn 的服务才会在退出时被清理。
