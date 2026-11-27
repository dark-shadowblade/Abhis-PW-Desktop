const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('../server/server.cjs');

let server;
const activeDownloads = new Map();
const pendingDownloads = new Map();

function safeFilename(value) {
  const name = path.basename(String(value || 'study-material').replace(/[\\/:*?"<>|]/g, '_')).trim();
  return name || 'study-material';
}

function sendDownload(webContents, channel, payload) {
  if (webContents && !webContents.isDestroyed()) webContents.send(channel, payload);
}

async function createWindow() {
  server = await startServer();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 620,
    backgroundColor: '#090d18',
    title: "Abhi's PW",
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.session.on('will-download', (event, item, contents) => {
    const queue = pendingDownloads.get(contents.id) || [];
    const task = queue.shift();
    if (!queue.length) pendingDownloads.delete(contents.id);
    else pendingDownloads.set(contents.id, queue);
    if (!task) return;

    const directory = path.join(app.getPath('downloads'), 'Mine Study');
    fs.mkdirSync(directory, { recursive: true });
    const savePath = path.join(directory, safeFilename(task.filename));
    item.setSavePath(savePath);
    activeDownloads.set(task.id, { item, contents });

    const report = state => sendDownload(contents, 'download:progress', {
      id: task.id,
      state,
      received: item.getReceivedBytes(),
      total: item.getTotalBytes(),
      filename: task.filename
    });
    item.on('updated', (_event, state) => report(state));
    item.once('done', (_event, state) => {
      activeDownloads.delete(task.id);
      sendDownload(contents, 'download:done', {
        id: task.id,
        state,
        received: item.getReceivedBytes(),
        total: item.getTotalBytes(),
        filename: task.filename,
        path: state === 'completed' ? savePath : '',
        error: state === 'completed' ? '' : 'Download interrupted'
      });
    });
    report('progress');
  });

  ipcMain.handle('download:start', (event, task) => {
    if (!task || !task.id || !task.url) throw new Error('Invalid download request');
    const url = new URL(task.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported download URL');
    const queue = pendingDownloads.get(event.sender.id) || [];
    queue.push({ id: String(task.id), filename: safeFilename(task.filename) });
    pendingDownloads.set(event.sender.id, queue);
    event.sender.downloadURL(url.toString());
    return { ok: true };
  });
  ipcMain.handle('download:pause', (_event, id) => {
    const task = activeDownloads.get(String(id));
    if (task && task.item.getState() === 'progressing' && !task.item.isPaused()) task.item.pause();
    return { ok: !!task };
  });
  ipcMain.handle('download:resume', (_event, id) => {
    const task = activeDownloads.get(String(id));
    if (task && task.item.isPaused() && task.item.canResume()) task.item.resume();
    return { ok: !!task };
  });
  ipcMain.handle('download:cancel', (_event, id) => {
    const task = activeDownloads.get(String(id));
    if (task && !['completed', 'cancelled'].includes(task.item.getState())) task.item.cancel();
    return { ok: !!task };
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL('http://127.0.0.1:4173');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
