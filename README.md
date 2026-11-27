# Abhi's PW

This repository contains the original Electron desktop shell and a separate browser-based web app.

## Web app

Requires Node.js 18 or newer.

```bash
npm install
npm run web
```

Open http://localhost:4174

The web app is in the web/ folder. It follows the actual Mine-Study-Android-Backup flow: fixed Server 1 key generation, key verification/activation, UPSC batch search, saved batches, subjects, chapters, the four Android content types, lecture playback, matching Notes/DPP resources, and chunked video downloads.

The local Node service is required for API proxying and the CDN custom byte-range streaming protocol. This is a browser webpage, not an Electron renderer.

## Existing Electron app

```bash
npm start
npm run build
```

The Electron app files remain in desktop/; its local service remains in server/. See web/README.md for web-specific details and browser limitations.
