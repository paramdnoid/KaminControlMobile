import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import JSZip from 'jszip';

import { convertGenesisZip } from '../src/genesisConverter.ts';
import type { GenesisBundleV1 } from '../../src/types.ts';

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

async function writeGenesisExportFolder(sourcePath: string, bundle: GenesisBundleV1, targetDirectory: string): Promise<string> {
  await mkdir(targetDirectory, { recursive: true });
  const jsonPath = path.join(targetDirectory, 'genesis-export-v2.json');
  await writeFile(jsonPath, JSON.stringify(bundle, null, 2), 'utf8');

  const pdfDocuments = bundle.pdfDocuments ?? [];
  if (!pdfDocuments.length) {
    return targetDirectory;
  }

  const zip = await JSZip.loadAsync(await readFile(sourcePath));
  for (const document of pdfDocuments) {
    if (!document.archivePath || !document.relativePath) {
      continue;
    }
    const entry = zip.files[document.archivePath];
    if (!entry || entry.dir) {
      continue;
    }
    const targetPath = path.join(targetDirectory, document.relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, await entry.async('nodebuffer'));
  }

  return targetDirectory;
}

async function writeGenesisTransportZip(sourcePath: string, bundle: GenesisBundleV1, targetPath: string): Promise<string> {
  const sourceZip = await JSZip.loadAsync(await readFile(sourcePath));
  const targetZip = new JSZip();
  targetZip.file('genesis-export-v2.json', JSON.stringify(bundle, null, 2));

  for (const document of bundle.pdfDocuments ?? []) {
    if (!document.archivePath || !document.relativePath) {
      continue;
    }
    const entry = sourceZip.files[document.archivePath];
    if (!entry || entry.dir) {
      continue;
    }
    targetZip.file(document.relativePath, await entry.async('nodebuffer'));
  }

  await writeFile(targetPath, await targetZip.generateAsync({ compression: 'STORE', type: 'nodebuffer' }));
  return targetPath;
}

app.whenReady().then(() => {
  ipcMain.handle('pick-genesis-zip', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Genesis-Sicherung auswählen',
      properties: ['openFile'],
      filters: [{ name: 'ZIP-Dateien', extensions: ['zip'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('convert-genesis-zip', async (_event, zipPath: string) => {
    return convertGenesisZip(zipPath);
  });

  ipcMain.handle('save-genesis-export-folder', async (_event, payload: { sourcePath: string; bundle: GenesisBundleV1 }) => {
    const result = await dialog.showOpenDialog({
      title: 'Genesis-Mobile-Exportordner wählen',
      defaultPath: path.join(path.dirname(payload.sourcePath), 'genesis-mobile-export'),
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return writeGenesisExportFolder(payload.sourcePath, payload.bundle, result.filePaths[0]);
  });

  ipcMain.handle('save-genesis-transport-zip', async (_event, payload: { sourcePath: string; bundle: GenesisBundleV1 }) => {
    const result = await dialog.showSaveDialog({
      title: 'Genesis-Mobile-Transport-ZIP speichern',
      defaultPath: path.join(path.dirname(payload.sourcePath), 'genesis-mobile-export.zip'),
      filters: [{ name: 'ZIP-Dateien', extensions: ['zip'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return writeGenesisTransportZip(payload.sourcePath, payload.bundle, result.filePath);
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
