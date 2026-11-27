# Abhi's PW — Web version

This is a browser implementation of the actual Mine-Study-Android-Backup app flow. It is separate from the Electron desktop shell and does not modify the Android backup repository.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run web
```

Open http://localhost:4174

## Android behaviour carried over

- API key generation uses /auth/generate?server=1.
- Verification first checks the current batch's subjects (or the Android legacy validation batch on a fresh install), activates the candidate only if needed, then verifies again.
- API key is kept in browser local storage for 24 hours.
- Batch search uses the UPSC cohort and exam query from the Android app; batches can be saved, selected, removed, or added by ID.
- Subject and chapter navigation uses the same API endpoints and field names.
- Content tabs are exactly videos, notes, DppNotes, and DppVideos.
- Lecture detail lookup extracts the stream URL using the same stream URL field family.
- Lecture resources load Notes and DPP Notes independently and are matched to the lecture number using the Android app's title patterns.
- Browser video playback is bridged through Node because the CDN expects ExoPlayer-style custom ?s=start&e=end requests rather than ordinary direct browser requests.
- Video downloads use 1 MiB segments, four concurrent segment requests, range validation and ordered output.

## Browser-specific differences

A browser cannot write directly into Android's Downloads/Mine Study folder or expose Android notifications/background services. The browser manages the destination and download history. Notes/PDF links are opened using their API-provided baseUrl.

## Important

Use only your own authorized API key. The key is stored locally in this browser; clear it from Settings on a shared device.
