const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { startServer } = require('../server/server.cjs');
let server;
async function createWindow() {
  server = await startServer();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 620,
    backgroundColor: '#090d18',
    title: "Abhi's PW",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadURL('http://127.0.0.1:4173');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
