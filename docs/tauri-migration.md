# Electron → Tauri 迁移工作量评估

评估日期：2026-08-14。基线代码：`demo-03` 当前 Electron 壳（共 ~560 行源码）。
Tauri 目标版本：[Tauri 2.11.x](https://v2.tauri.app/release/tauri/v2.11.5/)（当前稳定线）。

## 1. 结论先行

- **总工作量：2.5–4 人日**（熟悉 Tauri 者 ~2 天，不熟悉含工具链学习 ~4 天）。
- **UI 零重写**：boot screen 页面（HTML/CSS）100% 复用，只改 IPC 调用方式。
- **核心后端逻辑平移**：spawn / 探测 / 就绪解析 / 清理，~450 行 JS → ~350 行 Rust（tokio）。
- **收益**：安装包 103MB/123MB → **5–15MB**；无语言包裁剪、无每次构建下载 100MB 二进制的坑。

## 2. 文件级映射

| 现有文件（Electron） | 行数 | 迁移去向（Tauri） | 工作量 | 说明 |
|---|---|---|---|---|
| `src/main.js` | 179 | `src-tauri/src/lib.rs` + `main.rs` | 高 | 窗口/生命周期 → `WebviewWindowBuilder`；IPC → `#[tauri::command]`；退出清理 → `RunEvent::ExitRequested`；`proxy-bypass` 开关 → **删除**（系统 WebView 不读 env 代理，需实测确认） |
| `src/preload.js` | 14 | （删除） | — | Tauri 无 preload 概念；`contextBridge` → `invoke()` + `listen()` |
| `src/boot.html` | 89 | `src/index.html`（重命名） | 低 | 页面原样；内联 script 的 `window.dshBoot.*` 改为 `invoke('start_server')` / `listen('boot:state')`，约 10 行改动 |
| `src/config.js` | 61 | `src-tauri/src/config.rs` | 低 | 环境变量读取 + launcher 三级解析平移（`DSH_BIN` → PATH `which` → `pnpm dsh` + 仓库根检测） |
| `src/server.js` | 125 | `src-tauri/src/server.rs` | 高 | 探测（手写最小 HTTP GET，零依赖）→ `tokio::process::Command` spawn → `BufReader` 行读取解析就绪行 + `tokio::time::timeout` → 清理（Unix SIGTERM→SIGKILL 用 `nix` crate；Windows `taskkill /T`） |
| `src/server.test.js` | 42 | `server.rs` 内 `#[cfg(test)]` | 低 | 就绪行正则 / 探测（Rust 测试里起 `TcpListener`）/ launcher 描述 |
| `scripts/afterPack.js` | 54 | （删除） | — | Tauri 无语言包冗余 |
| `package.json` | 34 | 精简 + `Cargo.toml` + `tauri.conf.json` + `capabilities/` | 中 | 依赖从 electron/electron-builder 换成 tauri CLI；前端无构建链（静态目录） |

## 3. 关键实现映射（代码级）

### 3.1 IPC：invoke/handle → command/event

```rust
// Electron: ipcMain.handle('boot:start', ...) / preload contextBridge
#[tauri::command]
async fn start_server(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.start().await.map_err(|e| e.to_string())
}

// 事件：sendBootState(...) → app_handle.emit("boot:state", payload)
// 前端：window.dshBoot.onState(cb) → listen("boot:state", e => cb(e.payload))
```

前端不引入 `@tauri-apps/api` npm 包，直接手写 ~20 行 invoke 桥（`window.__TAURI_INTERNALS__.invoke`），保持零前端构建链。

### 3.2 spawn + 就绪行解析（tokio）

```rust
let mut child = tokio::process::Command::new(&launcher.command)
    .args(&launcher.args).arg("--port").arg("0")
    .stdout(Stdio::piped()).stderr(Stdio::piped())
    .spawn().map_err(...)?;

let url = tokio::time::timeout(timeout, async {
    let reader = BufReader::new(child.stdout.take().unwrap());
    let mut lines = reader.lines();
    while let Some(line) = lines.next_line().await? {
        if let Some(cap) = READY_LINE.captures(&line) { return Ok(cap[1].to_string()); }
    }
    Err("dsh web 提前退出")
}).await??;
```

（stderr 同样需要并行读取，避免管道阻塞——与 Node 版 `onData` 双管道语义一致。）

### 3.3 清理语义平移

| 平台 | Electron 现实现 | Tauri 对应 |
|---|---|---|
| POSIX | `SIGTERM` → 5s → `SIGKILL` | `nix::sys::signal::kill(pid, SIGTERM)` → 5s → `child.kill()`（SIGKILL） |
| Windows | `taskkill /pid <pid> /t /f` | `Command::new("taskkill")` 同参数平移 |

退出钩子：`tauri::Builder::build().run(|app, event| match event { RunEvent::ExitRequested { .. } => kill_child(...), _ => {} })`。

### 3.4 窗口

```rust
WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
    .title("DeepSeek Harness").inner_size(1280.0, 840.0)
    .build()?;
```

## 4. 步骤（建议顺序）

1. **脚手架**：`npm create tauri-app` 生成 `src-tauri/` 骨架，删掉示例前端。
2. **后端**：`config.rs` → `server.rs`（含测试）→ `lib.rs` 窗口/命令/事件/清理。
3. **前端**：`boot.html` → `index.html`，IPC 调用替换（10 行级改动）。
4. **单元测试**：`cargo test` 覆盖正则、探测（本地 TcpListener 起假服务）、launcher 解析。
5. **macOS 验证**：`tauri dev` 实跑 connect / spawn / 启动失败 / 无 launcher 四条路径（对照现 Electron 的 S1–S4 场景）。
6. **Windows 验证**：Windows 机器或 CI 跑同一套场景 + taskkill 清理实测。
7. **打包**：`tauri build` 出 dmg / NSIS；体积确认 5–15MB。

## 5. 风险点与对策

| # | 风险 | 影响 | 对策 |
|---|---|---|---|
| 1 | **系统 WebView 差异**（WKWebView / WebView2 / WebKitGTK 渲染本地页） | 低 | boot 页是纯静态深色 UI，无复杂特性；双平台实测即可 |
| 2 | **Windows WebView2 运行时依赖**：Win10/11 自带，Win7/8/Server 需单独安装（Electron 自包含无此问题） | 中 | 明确目标系统下限为 Win10；NSIS 安装器可内嵌 WebView2 bootstrapper 自动安装（[官方安装选项](https://www.w3cschool.cn/tauri/tauri-webview2-installation-options.html)） |
| 3 | **代理行为变化**：系统 WebView 不读 `http_proxy` env，Clash 劫持 loopback 的问题大概率消失，但系统代理对 loopback 的绕过行为需实测 | 中 | mac + Windows 实机验证 connect 路径 |
| 4 | **验证机制变化**：Electron 的 `--screenshot`（`capturePage`）在 Tauri 2 无内置 API | 低 | 验证改为：macOS `screencapture -l <window>` 截图，或 boot 状态事件断言（更轻） |
| 5 | **SIGTERM 需要 `nix` crate**（tokio `Child::kill` 只有 SIGKILL） | 低 | 加 `nix = { features = ["signal"] }` 小依赖 |
| 6 | **Rust 工具链**：首次 `cargo build` 编译 5–10 分钟；目标机器需 rustup | 低 | 一次性成本；构建在 CI 上做 |
| 7 | **Windows 打包仍需 Windows 环境**（与 Electron 相同，NSIS 非 Windows 平台要 wine） | 中 | CI（GitHub Actions windows-latest）出 NSIS；mac 出 dmg |
| 8 | **`dsh` 启动器 PATH 探测**：Rust 无 `which` 内建 | 低 | 手写 PATH 扫描（~15 行）或 `which` crate |

## 6. 工作量明细

| 任务 | 人日 |
|---|---|
| 脚手架 + Cargo/tauri.conf/capabilities 配置 | 0.5 |
| `server.rs` + `config.rs`（含单元测试） | 1.0 |
| `lib.rs` 窗口/命令/事件/退出清理 | 0.5 |
| 前端 `index.html` IPC 改造 | 0.25 |
| macOS 实跑验证四条路径 | 0.5 |
| Windows 实机/CI 验证 + NSIS | 0.5–1.0 |
| **合计** | **3.25–3.75 人日** |

## 7. 迁移后收益复核

| 维度 | Electron 现状 | Tauri 迁移后 |
|---|---|---|
| macOS dmg | 103MB | ~5–10MB |
| win64 安装包 | 123MB (zip) / NSIS 需 Windows | ~5–8MB NSIS |
| 构建网络依赖 | 每次构建拉 100MB+ 产物（代理易断） | 无此环节 |
| 内存占用 | Chromium 全量 | 系统 WebView（显著更低） |
| 语言包/afterPack | 需要裁剪 hook | 无此问题 |
