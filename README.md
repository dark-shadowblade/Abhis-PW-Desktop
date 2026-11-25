# Abhi's PW Desktop

A separate Windows desktop application for Abhi's PW, built with Electron and a bundled local Node.js service.

## Run locally
```bash
npm install
npm start
```

## Build Windows installer
```bash
npm run build
```

The Windows installer is also built by GitHub Actions. Open **Actions → Build Windows EXE** and download the `Abhis-PW-Windows-Installer` artifact after a successful run.

## Current status
- Desktop shell and local Node.js server: scaffolded.
- API proxy: intentionally not connected until the exact provider endpoints, headers, and authentication flow are verified from the Android app.
- Batch, subject, lecture and playback integration: pending.
- No Android repository or signing key is modified by this project.
