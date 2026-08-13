# dsh-web-desktop-shell

> **中文版**: [README.md](README.md) · Keep this file in sync whenever you update README.md.

A minimal Electron desktop shell that **starts (or connects to) a local `dsh web` server and shows the DeepSeek Harness Web GUI in a native window**.

The shell renders no UI logic itself — it is responsible for exactly three things:

1. **Probe**: check whether a harness instance is already running on `127.0.0.1:3080` (detected via the `__DSH_BOOT__` injection marker in `index.html`, so unrelated programs on the same port are never mistaken for the harness).
2. **Connect or start**:
   - Existing instance → connect directly (`mode=connect`), **without** starting a second server;
   - No instance → show the **boot screen**: automatically (or via the "Start server" button) spawn a `dsh web --port 0` (OS-assigned port, no conflicts) and parse the ready line `dsh web: http://127.0.0.1:<port>`;
   - Start failure / missing `dsh` → the error is shown on the boot screen (with retry and re-detect), **the app never dies with a dialog**.
3. **Cleanup**: when the window closes, a spawned server is stopped (`SIGTERM`, escalated to `SIGKILL` after 5 s), leaving no orphan processes.

> Why the backend is mandatory: the frontend is not a standalone static site — only `dsh web` injects `window.__DSH_BOOT__` into `index.html` and serves the plugin bundles. The shell can never load static files offline.

## Release status

**v0.1.0 (2026-08-14)**

- ✅ **macOS (Apple Silicon, arm64)**: released as `DeepSeek Harness-0.1.0-arm64.dmg` (see GitHub Releases).
- ⚠️ **Windows (win64)**: **not verified, not released**. win32 compatibility is implemented in code (`shell: true`, `taskkill /T` process-tree cleanup, NSIS config) and the packaging pipeline was validated by cross-building a win64 portable zip on macOS; however, **runtime behavior has not been tested on a real Windows machine**, so this release ships no Windows installer. See [Windows (win64) support status](#windows-win64-support-status) below.

## Contributing 🤝

Contributions are welcome! Whether it is fixing bugs, adding features, improving docs, or helping us **verify on real Windows / Linux machines** (currently only macOS is verified), all help is appreciated.

Please open an [issue](https://github.com/kimirong/deepseek-harness-desktop/issues) for suggestions or bug reports, or submit a pull request directly.

## Boot screen

The first screen of the window is a local status page (`src/boot.html`) that handles every "server is not running" case:

| Scenario | Behavior |
|---|---|
| Existing instance detected | Navigates to the GUI automatically (no interaction) |
| No instance, `dsh` available | Auto-starts (with progress); or press "Start server" |
| Start failure | Error details shown on the page + "Retry start" + "Re-detect", no exit |
| `dsh` not found | Page shows setup guidance (install `dsh` globally or set `DSH_BIN`) + "Re-detect" |
| Server exits unexpectedly | Back to the boot screen showing "Server exited" + retry |

## Directory structure

```
demo-03/
├── package.json        # electron dependency + electron-builder packaging config
├── src/
│   ├── main.js         # Electron main process: window, boot-screen state machine, lifecycle, cleanup
│   ├── preload.js      # IPC bridge between the boot screen and the main process (contextBridge)
│   ├── boot.html       # Boot screen (detect / one-click start / retry)
│   ├── config.js       # Config and `dsh` launcher resolution (env-overridable)
│   ├── server.js       # Probe / spawn / ready-line parsing / stop server
│   └── server.test.js  # Unit tests (no Electron required)
└── README.md
```

## Running

Prerequisite: the repository is built (`pnpm run build`), otherwise spawn mode fails.

```sh
npm install        # first time: installs electron
npm start          # launch the shell
```

Launcher resolution priority (used by spawn mode):

| Priority | Method | Scenario |
|---|---|---|
| 1 | `$DSH_BIN` | Packaged install: points at the `dsh` executable |
| 2 | `dsh` on PATH | Global install |
| 3 | `pnpm dsh` (repo root) | Source checkout (default; auto-locates two levels above `demo/demo-03`) |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DSH_SHELL_PORT` | `3080` | Probe port (connect mode) |
| `DSH_SHELL_TIMEOUT` | `120000` | Spawn readiness timeout (ms) |
| `DSH_SHELL_AUTO_START` | `1` | Auto-start the server when the probe finds nothing; set `0` to only show the "Start server" button and wait for the user |
| `DSH_BIN` | — | Explicit path to the `dsh` executable |
| `DSH_REPO_ROOT` | auto | Repo root for source checkouts |

## Verification

```sh
npm test                    # unit tests (no Electron needed)
npm start -- --screenshot   # render the GUI, save to ./shell-screenshot.png, then exit
npm start -- --screenshot --keep-open   # keep the window open after the screenshot
```

## Packaging (macOS / Windows)

```sh
npm run dist        # current platform: macOS → dmg, Windows → NSIS
```

The `electron-builder` config lives in the `build` field of `package.json`; for unsigned builds (local use) add `CSC_IDENTITY_AUTO_DISCOVERY=false`.

### Size optimization (built-in)

`scripts/afterPack.js` strips Electron's bundled locale files at package time (220 `.lproj` / 55 `.pak`, ~47 MB total), keeping only English and Chinese. Measured results:

| Artifact | Before | After |
|---|---|---|
| macOS dmg | 114 MB | 103 MB |
| win64 zip | 133 MB | 123 MB |

The remaining ~100 MB+ is the Electron runtime itself (Chromium + Node + V8 + ICU, main binary ~200 MB uncompressed), already at its compression limit — **going below ~30 MB requires a different technology** (Tauri or a system-WebView shell, see below).

### Size floor and more aggressive options

| Option | Installer size | Cost |
|---|---|---|
| Current Electron shell | dmg 103 MB / zip 123 MB | Already at the Electron floor |
| Electron + electron-updater | First install unchanged, **subsequent updates only download a delta (a few MB)** | Requires an update server / signing |
| Tauri (system WebView + Rust) | 5–15 MB | Main process rewritten in Rust; spawn/probe/boot-screen logic is portable |
| Native WebView shell (Swift/C#) | ~1 MB | Two codebases (WKWebView + WebView2) |

## Windows (win64) support status

**Code-level compatibility is in place; a win64 portable zip was cross-built successfully on macOS** (`dist/dsh-web-desktop-shell-0.1.0-win.zip`, containing a PE32+ x86-64 exe); however, **runtime behavior has not been tested on Windows** (this repository is developed and verified on macOS only). What is already handled:

- All spawns use `shell: true` on win32, compatible with `pnpm.cmd` / `dsh.cmd` shims; `commandOnPath` uses `where`;
- Process-tree cleanup: win32 uses `taskkill /pid <pid> /t /f` (plain `child.kill()` only force-kills the direct child on Windows, leaving the pnpm → node grandchildren behind as orphans);
- Packaging config: `win.target: nsis`.

**Running on Windows** (requires a Windows machine, Node 22+):

```sh
npm install
npm start            # or install dsh globally first
```

**Cross-building a win64 portable zip (works on macOS, no wine)** — skips resedit (icon/metadata editing, needs wine) and uses a local win32-x64 electron zip:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win zip --x64 \
  -c.electronDist=/tmp/electron-v43.4.0-win32-x64.zip \
  -c.win.signAndEditExecutable=false
```

Note: with `signAndEditExecutable=false` the exe keeps the default filename (`dsh-web-desktop-shell.exe`) and has no icon/version metadata.

**NSIS installer** (`npm run dist` produces `*-setup.exe` on Windows) must be built on Windows — cross-building NSIS on macOS requires wine, not recommended.

**Windows-specific risks (untested, verify on first run)**:

| Risk | Notes |
|---|---|
| spawn quoting | `shell: true` + argument array joining under cmd needs real-machine confirmation (current args are simple tokens, low risk) |
| `dsh` install shape | On user machines `dsh` may be `dsh.exe` / `dsh.cmd` / not installed — the boot screen shows guidance (set `DSH_BIN`) when it is missing |
| taskkill cleanup | The process-tree kill path is written, but actual exit behavior on Windows needs real-machine verification |

## Notes

- **Loopback only**: the harness listens on `127.0.0.1` by default and explicitly rejects `--host 0.0.0.0` (a security red line). This shell can only be a local client.
- **Windows spawn**: all spawns use `shell: true` on win32, automatically compatible with `pnpm.cmd` / `dsh.cmd`.
- **Connecting to an existing instance**: the shell never kills it (`child: null`, read-only connection); only servers it spawned itself are cleaned up on exit.
