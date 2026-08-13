'use strict'
// Shell configuration: everything deployment-varying is an env override with a
// sane demo default, so the same binary works from a source checkout or a
// packaged install.
const path = require('node:path')
const fs = require('node:fs')

// src/ -> demo-03/ -> demo/ -> repo root (when run from a source checkout)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')

module.exports = {
  // Port probed for an already-running harness instance. The official GUI
  // default is 3080; only used in connect mode (no server is spawned for it).
  connectPort: Number(process.env.DSH_SHELL_PORT ?? 3080),
  // How long to wait for a spawned `dsh web` to print its ready line. First
  // boot of a profile can be slow (template init), so keep it generous.
  timeoutMs: Number(process.env.DSH_SHELL_TIMEOUT ?? 120000),
  // When the probe finds nothing, auto-start a server instead of waiting for
  // the user to press the boot screen button. Set 0 to only offer the button.
  autoStart: process.env.DSH_SHELL_AUTO_START !== '0',
  // `--screenshot` captures the rendered GUI to ./shell-screenshot.png, then
  // quits unless `--keep-open` is also passed. Used for verification.
  screenshot: process.argv.includes('--screenshot') || process.env.DSH_SHELL_SCREENSHOT === '1',
  keepOpen: process.argv.includes('--keep-open'),
  launcher: resolveLauncher(),
}

/**
 * Resolve how to start a `dsh web` server, in priority order:
 *   1. $DSH_BIN        explicit path to a `dsh` executable (packaged installs)
 *   2. `dsh` on PATH   global install
 *   3. `pnpm dsh`      source checkout (repo root from $DSH_REPO_ROOT or this file's location)
 * Returns null when nothing is available; spawn mode then fails loudly.
 */
function resolveLauncher() {
  // On Windows, dsh/pnpm resolve to .cmd shims that spawn() can only run with
  // shell: true; on POSIX plain exec is fine and avoids quoting surprises.
  const winShell = process.platform === 'win32'
  if (process.env.DSH_BIN) {
    return { command: process.env.DSH_BIN, args: ['web'], cwd: undefined, shell: winShell }
  }
  if (commandOnPath('dsh')) {
    return { command: 'dsh', args: ['web'], cwd: undefined, shell: winShell }
  }
  const repoRoot = process.env.DSH_REPO_ROOT || REPO_ROOT
  if (fs.existsSync(path.join(repoRoot, 'package.json'))) {
    return {
      command: winShell ? 'pnpm.cmd' : 'pnpm',
      args: ['dsh', 'web'],
      cwd: repoRoot,
      shell: winShell,
    }
  }
  return null
}

function commandOnPath(name) {
  const { spawnSync } = require('node:child_process')
  const probe = process.platform === 'win32' ? 'where' : 'which'
  return spawnSync(probe, [name], { stdio: 'ignore' }).status === 0
}
