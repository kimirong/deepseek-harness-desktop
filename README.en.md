# DeepSeek Harness Desktop

> **中文版**: [README.md](README.md) · Keep this file in sync whenever you update README.md.

![License](https://img.shields.io/badge/license-MIT-green) ![Release](https://img.shields.io/github/v/release/kimirong/deepseek-harness-desktop) ![macOS](https://img.shields.io/badge/platform-macOS_arm64-brightgreen) ![Windows](https://img.shields.io/badge/platform-Windows-unverified-orange)

> A lightweight desktop client: connects to or starts the local DeepSeek Harness server and opens its Web GUI in a native window.

DeepSeek Harness Desktop is an Electron desktop shell. It does not re-implement any Harness functionality — it manages the lifecycle of the `dsh web` server: **probing** whether an instance is already running locally, **starting** the server (or letting the user start it with one click), and **cleaning up** orphan processes on exit — then presents the Web GUI as a native desktop app.

## Features

- **Auto-connect**: when a local `dsh web` instance is detected, it opens directly without starting a second server
- **One-click start**: when no instance exists, automatically (or via a button) starts a `dsh web --port 0` with an OS-assigned port, so there are no conflicts
- **Friendly boot screen**: on start failure or a missing `dsh`, errors are shown on the page with retry / re-detect — the app never dies with a dialog
- **Clean exit**: closing the window stops any self-started server (SIGTERM → SIGKILL), leaving no orphan processes
- **Size optimization**: Electron locale files are stripped at package time; the macOS installer is 103 MB
- **Open source**: MIT License

## Preview

The boot screen (detect / one-click start / retry):

![boot screen](assets/screenshot-boot.png)

## Installation

Download `DeepSeek Harness-<version>-arm64.dmg` from [GitHub Releases](https://github.com/kimirong/deepseek-harness-desktop/releases), open it, and drag the app into the "Applications" folder.

> **Requirements**
>
> - macOS 13+ (Apple Silicon, arm64)
> - A usable `dsh` installed locally (or point to one via the `DSH_BIN` environment variable)
> - If macOS warns about an "unidentified developer" on first launch: System Settings → Privacy & Security → Open Anyway

## Quick start

1. Download and install the dmg (above)
2. Open "DeepSeek Harness"
3. The app auto-detects the local server: it connects if one exists, otherwise shows the "Start server" button — click it to start and enter

## Usage

| Scenario | Behavior |
|---|---|
| A `dsh web` instance is already running (default port 3080) | Auto-connects, no duplicate server |
| No instance, `dsh` installed | Auto-starts, or press "Start server" |
| Start failure | Error details + "Retry start" + "Re-detect" on the page |
| `dsh` not found | Setup guidance + "Re-detect" on the page |
| Server exits unexpectedly | Back to the boot screen, can retry |

Common configuration (environment variables):

| Variable | Default | Purpose |
|---|---|---|
| `DSH_BIN` | — | Path to the `dsh` executable (for packaged installs) |
| `DSH_SHELL_PORT` | `3080` | Probe port used to connect to a running instance |
| `DSH_SHELL_AUTO_START` | `1` | Set `0` to disable auto-start and only show the "Start server" button |

See the [developer docs](docs/DEVELOPMENT.md) for the full variable list.

## Platform support

| Platform | Status |
|---|---|
| macOS (Apple Silicon, arm64) | ✅ Released |
| Windows (win64) | ⚠️ Code-compatible, **not verified on real hardware, not released** |
| Linux | ❌ Not supported |

## Known limitations

- **Local only**: the Harness listens on `127.0.0.1` by default (a security red line — the source explicitly rejects `--host 0.0.0.0`), so this client does not support remote access
- **Unsigned**: the installer is a locally built, unsigned binary; first launch requires manual approval in System Settings
- **Windows unverified**: runtime behavior has not been tested on real Windows hardware, so no Windows installer ships in the current release

## Roadmap

- [ ] Verify on real Windows hardware and release the Windows installer
- [ ] Linux support
- [ ] Size roadmap: electron-updater delta updates / Tauri migration assessment (see the [developer docs](docs/DEVELOPMENT.md))

## Developers

Build, test, and packaging guides live in the [developer docs](docs/DEVELOPMENT.md). The Tauri migration work assessment is in [docs/tauri-migration.md](docs/tauri-migration.md).

## Contributing

Contributions are welcome! Whether it is fixing bugs, adding features, improving docs, or helping us **verify on real Windows / Linux machines** (currently only macOS is verified).

Please open a [GitHub Issue](https://github.com/kimirong/deepseek-harness-desktop/issues) or submit a pull request directly.

## License

[MIT](LICENSE) © 2026 kimirong
