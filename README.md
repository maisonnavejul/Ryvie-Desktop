<p align="center">
  <img src="ryvielogo0.png" alt="Ryvie logo" width="140" />
</p>

# Ryvie Connect

**English** · [Français](README.fr.md)

> Part of the [Ryvie](https://github.com/ryvieos/Ryvie) ecosystem, the self-hosted personal cloud OS. Learn more at [ryvie.fr](https://ryvie.fr).

Electron app to launch Ryvie, with automatic detection of local and public availability and secure remote access through an embedded NetBird tunnel.

## Features

- **Automatic detection.** Tests the local API `http://ryvie.local:3002` (machine-id / domains).
- **Local ↔ remote switching.** If the local connection fails, it falls back to the public URL (the `app` domain) or the tunnel.
- **Built-in tunnel.** Configures NetBird automatically from the key provided by the Ryvie server (remote access with no manual setup).
- **Multi-profile.** Manage several Ryvie instances (add, rename, remove, switch).
- **Single-page interface.** Login and connected screen live in one document, with smooth transitions and no reload.
- **Automatic updates.** Through GitHub Releases (electron-updater).
- **Persistent storage.** Saves profiles and user configuration.

## Requirements

- Node.js 18+ recommended
- Windows, macOS or Linux (builds configured for all 3 platforms)

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

## Build & scripts

| Command | Description |
|----------|-------------|
| `npm start` | Runs the app in development mode. |
| `npm run fetch:netbird` | Downloads the NetBird binary + Wintun (Windows) into `resources/netbird/`. |
| `npm run icons:win` | Generates the Windows icon (`.ico`) from the SVG with a rounded white background. |
| `npm run icons:mac` | Generates the macOS icons (`.icns` and PNG for Linux). |
| `npm run icons:all` | Generates all icons (Windows + macOS/Linux). |
| `npm run build:win` | Windows build (runs `fetch:netbird` then produces the `.exe`). |
| `npm run build:mac` | macOS build (generates `.dmg` and `.zip`). |
| `npm run build:linux` | Linux build (generates `.AppImage` and `.deb`). |
| `npm run build:all` | Build for all platforms (runs `fetch:netbird`, requires the matching OS). |
| `npm run publish` | Publishes the builds to GitHub Releases. |

Installers are produced in `dist/`.

> ⚠️ **Important**: locally you can only build for your current OS. To build all 3 platforms, use GitHub Actions (see below).

## Single-page architecture

The app loads **a single document** ([src/renderer/index.html](src/renderer/index.html)) that contains two views:

- `#login-view` — profile selection / login (logic in [login.js](src/renderer/login.js))
- `#app-view` — connected screen, status, open Ryvie, log out (logic in [renderer.js](src/renderer/renderer.js))

A small router ([app.js](src/renderer/app.js)) switches between views (`window.Ryvie.showLogin()` / `showApp()`) with CSS transitions, **without ever reloading the page**, so there is no white flash between screens.

> Because the DOM persists between views, a screen's state must be reset in its `init()` (`checkConnection` for the connected view, `bootLogin` for the login view).

## Embedded NetBird tunnel

Remote access relies on [NetBird](https://netbird.io) (a WireGuard tunnel). The binary is **embedded in the app**, so the user has nothing to install separately.

- **Pinned version.** Single source in [netbird-version.json](netbird-version.json), read by both the build script and the main process.
- **Fetched at build time.** `fetch:netbird` downloads `netbird.exe` (x64 + arm64) from the NetBird releases **and** `wintun.dll` from wintun.net, into `resources/netbird/<arch>/`. These binaries are **not** tracked in git (`.gitignore`).
- **Embedding.** `build.extraResources` copies `resources/netbird/` into the app.
- **Deployment (Windows).** On first setup the binary is copied to a stable location `C:\ProgramData\Ryvie\netbird\`, and the NetBird **Windows service** runs from that copy (1 UAC elevation). This way an app update never locks the binary.
- **Fallback.** If no binary is present in `resources/netbird/`, the app automatically falls back to installing the official NetBird **MSI**.

### Update the NetBird version

1. Edit the number in [netbird-version.json](netbird-version.json) (must be an existing NetBird release tag).
2. Bump `version` in `package.json` (required for the update to reach users).
3. `npm run publish` (the build re-runs `fetch:netbird` and re-embeds the binary).

On the next launch after the app update, if the NetBird version changed, the app updates the deployed copy (1 UAC). An app update that does **not** change NetBird requires **no** elevation.

## Usage

1. On startup: splash, then the login view (or directly the connected screen if a profile exists).
2. The app tests the local API `http://ryvie.local:3002` then, if needed, configures/uses the NetBird tunnel.
3. The "Open Ryvie" button opens:
   - **Locally**: `http://ryvie.local` in the default browser.
   - **Otherwise**: the public URL returned by the API (e.g. `https://app-xxxxx.ryvie.fr`) or the tunnel.
4. If a new local Ryvie ID is detected, a confirmation is requested.

## Configuration

- User config: `%AppData%/Ryvie Connect/ryvie-config.json` (+ `ryvie-users.json`, `ryvie-current-user.json`)
- Deployed NetBird binary (Windows): `C:\ProgramData\Ryvie\netbird\`
- App/shortcut icon: `build/icons/win/icon.ico`
- Default URLs:
  - Local API: `http://ryvie.local:3002`
  - Local app: `http://ryvie.local`
  - NetBird management: `https://netbird.ryvie.fr`

## Cross-platform icons (rounded corners)

- **Source**: `ryvielogo0.svg`
- **Style**: white background with iOS-style rounded corners

### Windows
- Script: `npm run icons:win`
- Sizes: 16, 24, 32, 48, 64, 128, 256 px
- Output: `build/icons/win/icon.ico`

### macOS
- Script: `npm run icons:mac`
- Sizes: 16@1x/2x, 32@1x/2x, 128@1x/2x, 256@1x/2x, 512@1x/2x
- Output: `build/icons/mac/icon.icns` (+ `.iconset/`)

### Linux
- Generated automatically with `npm run icons:mac`
- PNG sizes: 16, 32, 64, 128, 256, 512, 1024 px
- Output: `build/icons/mac/png/`

> ⚠️ Re-run `npm run icons:all` before each build if the SVG changes.

## Automatic builds with GitHub Actions

A workflow (`.github/workflows/build.yml`) builds automatically on all 3 platforms.

**📱 macOS:** the app is **signed and notarized** with a Developer ID certificate. See [MACOS_SIGNING.md](MACOS_SIGNING.md).

### Triggers

**Version tag (recommended)**
```bash
git tag v0.0.33
git push origin v0.0.33
```
→ Automatic build + creation of a GitHub release with all installers.

**Manual trigger**: "Actions" tab → "Build & Release" → "Run workflow".

### Outputs

- **Windows**: `Ryvie-Setup-x.x.x.exe` + update files
- **macOS**: `.dmg` + `.zip` + update files
- **Linux**: `.AppImage` + `.deb`

## Automatic updates (Electron Updater)

1. **Bump `version`** in `package.json` before each release.
2. **Create a tag** then push (triggers GitHub Actions).
3. **The app** checks for updates on startup and downloads the release from the `publish` target (`package.json`).

> **Note**: auto-updates on Windows and macOS. On Linux, the user downloads the new version manually.
>
> The publish target (`build.publish`) must stay stable: an installed app looks for its updates on the repository baked into its build. See the notes on repository migration before changing `owner`/`repo`.

## Project structure

- `src/main/main.js` — Electron main process (windows, updater, NetBird, IPC)
- `src/main/preload.js` — IPC bridge (contextBridge)
- `src/renderer/index.html` — single page (login + connected views)
- `src/renderer/app.js` — single-page router (view switching)
- `src/renderer/login.js` — login / profiles view logic
- `src/renderer/renderer.js` — connected view logic
- `src/renderer/styles.css` — styles
- `src/renderer/splash.html` — splash screen
- `netbird-version.json` — pinned NetBird version (single source)
- `scripts/fetch-netbird.js` — downloads NetBird + Wintun at build time
- `resources/netbird/` — embedded binaries (not tracked)
- `THIRD_PARTY_NOTICES.txt` — licenses of third-party components (NetBird, Wintun)
- `package.json` — scripts, dependencies, electron-builder config

## Technologies

- Electron
- Node.js
- electron-builder / electron-updater
- NetBird (WireGuard tunnel) + Wintun (Windows)

## Third-party licenses

See [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt): NetBird (client) is under BSD-3-Clause, Wintun under its own terms. These notices ship with the application.

## Troubleshooting

### macOS: installation
The app is **signed and notarized**. If you see a security prompt, see [MACOS_SIGNING.md](MACOS_SIGNING.md#dépannage).

### NetBird / remote access (Windows)
- Check the service: `sc query NetBird` (should be `RUNNING`).
- Check the deployed binary: `C:\ProgramData\Ryvie\netbird\` must contain `netbird.exe`, `wintun.dll`, `version.txt`.
- "Unable to load wintun.dll" error: `wintun.dll` must sit next to `netbird.exe` (handled by the deployment).
- Reset to re-test the install (admin PowerShell):
  ```powershell
  & "C:\ProgramData\Ryvie\netbird\netbird.exe" service stop
  & "C:\ProgramData\Ryvie\netbird\netbird.exe" service uninstall
  Remove-Item -Recurse -Force "C:\ProgramData\Ryvie\netbird"
  ```

### Other issues
- If `ryvie.local` does not resolve: check local DNS/hosts or the server availability.
- If nothing opens: launch from a terminal and check the console.
- To force local opening: make sure the local API responds with `success: true` and provides `domains`.
