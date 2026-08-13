'use strict'
// Electron main process: owns the native window, the server lifecycle, the
// boot screen (detect / one-click start / retry), and a clean shutdown that
// never leaves an orphan `dsh web` behind.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const config = require('./config')
const { probeExisting, spawnDshWeb, stopChild, describeLauncher } = require('./server')

// The harness binds loopback only. Make sure Chromium never routes 127.0.0.1
// through a system/env proxy (e.g. Clash on 127.0.0.1:7897), which would turn
// every request into a 502.
app.commandLine.appendSwitch('proxy-bypass-list', '<-loopback>')

let win = null
let server = null // { mode, url, child }
let starting = false
let quitting = false

const BOOT_PAGE = path.join(__dirname, 'boot.html')

// ---- boot screen state -----------------------------------------------------

/** Push a state object to the boot screen renderer. */
function sendBootState(state) {
  if (win && !win.isDestroyed()) win.webContents.send('boot:state', state)
}

function launcherHint() {
  return describeLauncher(config.launcher)
}

function launcherDetail() {
  const hint = launcherHint()
  return hint
    ? `启动命令：${hint}\n未在 127.0.0.1:${config.connectPort} 检测到服务，点击下方按钮即可启动。`
    : '未找到可用的 dsh 启动器。\n请全局安装 dsh，或设置环境变量 DSH_BIN 指向 dsh 可执行文件，然后点击「重新检测」。'
}

// ---- server actions --------------------------------------------------------

/** Connect to an already-running instance (read-only: never owns the child). */
async function connectExisting(port) {
  server = { mode: 'connect', url: `http://127.0.0.1:${port}/`, child: null }
  console.log(`[dsh-shell] mode=connect url=${server.url}`)
  await win.loadURL(server.url)
}

/**
 * Spawn `dsh web` (one-click start / auto-start / retry share this path).
 * On success the window navigates to the GUI; on failure the boot screen
 * shows the error and re-enables the buttons — the shell never dies on a
 * missing or failing server.
 */
async function startServerFlow() {
  if (starting) return
  if (!config.launcher) {
    sendBootState({ phase: 'error', text: '无法启动：缺少 dsh 启动器', detailKind: 'error', detail: launcherDetail() })
    return
  }
  starting = true
  sendBootState({ phase: 'starting', text: '正在启动服务…', detailKind: 'info', detail: `执行：${launcherHint()}\n首次启动可能需要几十秒（初始化 profile）。` })
  try {
    const spawned = spawnDshWeb(config.launcher, config.timeoutMs)
    const url = await spawned.url // url is a Promise; await it before use
    server = { mode: 'spawn', url, child: spawned.child }
    console.log(`[dsh-shell] mode=spawn url=${url}`)
    watchChild(spawned.child)
    await win.loadURL(url)
  } catch (err) {
    server = null
    console.error('[dsh-shell] start failed:', err)
    sendBootState({
      phase: 'error',
      text: '服务启动失败',
      detailKind: 'error',
      detail: `${err.message}\n\n可点击「重试启动」再次尝试，或先手动启动服务后再点「重新检测」。`,
    })
  } finally {
    starting = false
  }
}

/** Re-probe: connect if an instance appeared, otherwise show the idle screen. */
async function retryProbe() {
  sendBootState({ phase: 'detecting', text: '正在检测本地服务…', detailKind: 'info', detail: `探测端口：127.0.0.1:${config.connectPort}` })
  const running = await probeExisting(config.connectPort)
  if (running) return connectExisting(config.connectPort)
  sendBootState({ phase: 'idle', text: '未检测到正在运行的服务', detailKind: 'info', detail: launcherDetail() })
}

// ---- boot ------------------------------------------------------------------

async function boot() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    title: 'DeepSeek Harness',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  await win.loadFile(BOOT_PAGE)

  sendBootState({ phase: 'detecting', text: '正在检测本地服务…', detailKind: 'info', detail: `探测端口：127.0.0.1:${config.connectPort}` })
  const running = await probeExisting(config.connectPort)
  if (running) {
    await connectExisting(config.connectPort)
    scheduleScreenshot()
    return
  }

  // Nothing running: show the boot screen; auto-start unless disabled.
  if (config.launcher && config.autoStart) {
    await startServerFlow()
  } else {
    sendBootState({ phase: 'idle', text: '未检测到正在运行的服务', detailKind: 'info', detail: launcherDetail() })
  }
  scheduleScreenshot()
}

// ---- IPC -------------------------------------------------------------------

ipcMain.handle('boot:start', () => startServerFlow())
ipcMain.handle('boot:retry', () => retryProbe())

// ---- lifecycle -------------------------------------------------------------

// A spawned server dying on its own is a hard failure, but the shell stays
// alive: fall back to the boot screen with an error instead of a dead page.
function watchChild(child) {
  child.on('exit', (code, signal) => {
    if (quitting || win.isDestroyed() || win.webContents.getURL().startsWith('file:')) return
    server = null
    sendBootState({
      phase: 'error',
      text: '服务已退出',
      detailKind: 'error',
      detail: `dsh web 已退出 (code=${code}, signal=${signal})\n\n可点击「重试启动」重新拉起服务。`,
    })
    win.loadFile(BOOT_PAGE)
  })
}

// Verification aid: capture whatever is on screen (GUI or boot screen) to
// ./shell-screenshot.png, then quit unless --keep-open was passed.
function scheduleScreenshot() {
  if (!config.screenshot) return
  setTimeout(async () => {
    if (win && !win.isDestroyed()) {
      const image = await win.webContents.capturePage()
      const out = path.resolve(process.cwd(), 'shell-screenshot.png')
      fs.writeFileSync(out, image.toPNG())
      console.log(`[dsh-shell] screenshot saved: ${out}`)
    }
    if (!config.keepOpen) app.quit()
  }, 2500)
}

app.whenReady().then(boot)

// Single-window tool: closing the window quits on every platform.
app.on('window-all-closed', () => app.quit())

// Kill a spawned server before exit; without this the child would outlive the
// shell (default spawn has no auto-kill on parent death).
app.on('before-quit', (event) => {
  if (quitting) return
  const child = server?.child
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  event.preventDefault()
  quitting = true
  stopChild(child).finally(() => app.quit())
})
