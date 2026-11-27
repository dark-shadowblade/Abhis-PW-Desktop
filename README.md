# Abhi's PW Desktop

An Electron desktop study workspace with a local Node.js API/CDN proxy.

## Run locally
```bash
npm install
npm start
```

## Build Windows installer
```bash
npm run build
```
The GitHub Actions workflow can also build the Windows installer.

## Included
- Server 1 / Server 2 selection
- Study API key generation, activation and verification
- Batch → subject → chapter navigation
- Video lecture playback through the local Node server
- Notes and DPP resource links
- Chunked video downloads
- Responsive dark desktop/mobile layout

## Streaming architecture
The Electron renderer never contacts the CDN directly. It requests `/video?url=...` from the bundled local Node server. The server converts standard browser `Range: bytes=...` requests into the CDN's custom `?s=start&e=end` range protocol, then streams the returned 206 response to the video element. Downloads use the same custom range protocol through `/download`.

Study API calls use the local `/api/v1/*` route; the server forwards them to `https://v1.sgmvv1.xyz/api/v1` and forwards the `x-api-key` header.

## API key storage
The key is stored in the Electron renderer's localStorage and expires locally after 24 hours. Keep it private.

## Notes
- Existing Electron main process and package/build configuration are retained.
- CDN proxy only accepts HTTPS hosts matching `a<number>.stmvv1.xyz`.
- Live API response formats and real account playback must still be verified with an authorized key.
- For production distribution, consider adding stronger local IPC boundaries and request throttling.
