import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { convertGenesisZip } from '../src/genesisConverter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    title: 'KaminControl Genesis Converter',
    backgroundColor: '#f7f5f0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.resolve(__dirname, '../../.desktop-build/renderer/index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('pick-genesis-zip', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Genesis Daten.zip auswählen',
      properties: ['openFile'],
      filters: [{ name: 'ZIP-Dateien', extensions: ['zip'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('convert-genesis-zip', async (_event, zipPath: string) => {
    return convertGenesisZip(zipPath);
  });

  ipcMain.handle('save-genesis-bundle', async (_event, payload: { sourcePath: string; bundle: unknown }) => {
    const defaultPath = path.join(path.dirname(payload.sourcePath), 'genesis-export-v1.json');
    const result = await dialog.showSaveDialog({
      title: 'Genesis-Bundle speichern',
      defaultPath,
      filters: [{ name: 'JSON-Dateien', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await writeFile(result.filePath, JSON.stringify(payload.bundle, null, 2), 'utf8');
    return result.filePath;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
