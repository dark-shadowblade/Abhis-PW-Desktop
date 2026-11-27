# Abhi's PW — GitHub Pages website

This is a frontend-only browser version of the Mine Study study library.

- Open the public GitHub Pages URL in any modern browser.
- Each visitor enters their own API key; the key is stored only in that browser's local storage.
- Server 1 is fixed, matching the Android app.
- No Node.js, server.js, local server, or installation is required to use the website.

## Browser compatibility note

The site calls the Study API directly from the browser. The API must allow cross-origin (CORS) requests for the website's domain. Video playback and downloads also use the returned CDN URL directly; if that CDN requires the Android app's custom chunk/range protocol or blocks browser CORS, playback/downloads will not work in a browser without server-side proxying. This website intentionally does not include a proxy/backend.

The original Electron desktop app files are separate and unchanged.
