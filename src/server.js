'use strict'
// Server lifecycle for the desktop shell: connect to an already-running
// `dsh web` instance when one answers on the probe port, otherwise spawn a
// fresh one and wait for its readiness line. The frontend is not a standalone
// static site (only `dsh web` injects window.__DSH_BOOT__), so the shell must
// always end up pointing at a live server it can account for.
const { spawn } = require('node:child_process')
const http = require('node:http')

// The web-app bundle prints this line once the HTTP server is listening:
//   dsh web: http://127.0.0.1:<port>[( LAN: http://<lan-ip>:<port>)]
const READY_LINE = /dsh web: (http:\/\/127\.0\.0\.1:\d+)/

/**
 * True when a harness instance already serves the boot-injected index on the
 * given loopback port. The `__DSH_BOOT__` marker distinguishes the harness
 * from any unrelated process that happens to listen on the same port.
 * Node's http client does not honor http_proxy, so this probe is proxy-free.
 */
function probeExisting(port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: timeoutMs }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('__DSH_BOOT__')))
    })
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.on('error', () => resolve(false))
  })
}

/**
 * Spawn `dsh web --port 0` (OS-assigned port, no conflicts) and resolve with
 * the printed loopback URL. Rejects on launcher ENOENT, readiness timeout, or
 * early child exit; the child is killed on timeout so no orphan server is left.
 */
function spawnDshWeb(launcher, timeoutMs) {
  const child = spawn(launcher.command, [...launcher.args, '--port', '0'], {
    cwd: launcher.cwd,
    shell: launcher.shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1' },
  })
  const url = new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try { child.kill('SIGTERM') } catch { /* already gone */ }
      reject(new Error(`dsh web 启动超时（${Math.round(timeoutMs / 1000)}s），未等到就绪行`))
    }, timeoutMs)
    const onData = (chunk) => {
      const match = String(chunk).match(READY_LINE)
      if (match) {
        settled = true
        clearTimeout(timer)
        resolve(match[1])
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`无法启动 ${launcher.command}: ${err.message}（已设置 DSH_BIN 或 DSH_REPO_ROOT 吗？）`))
    })
    child.on('exit', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`dsh web 提前退出 (code=${code}, signal=${signal})`))
    })
  })
  return { child, url }
}

/**
 * Stop a spawned server. POSIX: SIGTERM first, escalate to SIGKILL after 5s.
 * Windows: kill() is a hard TerminateProcess and only hits the direct child
 * (pnpm/dsh shim), whose own children would survive as orphans — so use
 * taskkill /T to kill the whole process tree instead.
 * Resolves when the child has exited (or was already gone).
 */
function stopChild(child) {
  if (process.platform === 'win32') return stopChildWindows(child)
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve()
    const killer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* already gone */ }
    }, 5000)
    child.once('exit', () => { clearTimeout(killer); resolve() })
    try { child.kill('SIGTERM') } catch { resolve() }
  })
}

function stopChildWindows(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve()
    const killer = setTimeout(() => {
      try { child.kill() } catch { /* already gone */ }
      resolve()
    }, 5000)
    const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    taskkill.on('exit', () => { clearTimeout(killer); resolve() })
    taskkill.on('error', () => {
      clearTimeout(killer)
      try { child.kill() } catch { /* already gone */ }
      resolve()
    })
  })
}

/**
 * Human-readable rendering of a launcher, shown on the boot screen so the
 * user sees exactly what "一键启动" will run. Returns null when no launcher
 * is available.
 */
function describeLauncher(launcher) {
  if (!launcher) return null
  return [launcher.command, ...launcher.args, '--port', '<自动分配>'].join(' ')
}

module.exports = { READY_LINE, probeExisting, spawnDshWeb, stopChild, describeLauncher }
