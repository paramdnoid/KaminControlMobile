import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

import type { GenesisBundlePdfDocument, GenesisBundlePreview, GenesisBundleV1 } from '../types';

async function readAssetText(asset: DocumentPickerAsset): Promise<string> {
  if (asset.file && 'text' in asset.file) {
    return asset.file.text();
  }

  return FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

function isBundle(value: unknown): value is GenesisBundleV1 {
  const candidate = value as Partial<GenesisBundleV1>;
  return (
    (candidate?.schemaVersion === 'genesis-bundle.v1' || candidate?.schemaVersion === 'genesis-bundle.v2') &&
    Boolean(candidate.metadata) &&
    Array.isArray(candidate.properties) &&
    Array.isArray(candidate.installations) &&
    Array.isArray(candidate.plannedWork) &&
    Array.isArray(candidate.history)
  );
}

function validateBundle(bundle: GenesisBundleV1): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const property of bundle.properties) {
    if (!property.sourceKey) {
      warnings.push('Eine Liegenschaft hat keinen Genesis-Schluessel.');
      continue;
    }
    if (seen.has(property.sourceKey)) {
      warnings.push(`Doppelter Genesis-Schluessel ${property.sourceKey}.`);
    }
    seen.add(property.sourceKey);
    if (!property.customerNumber && !property.street) {
      warnings.push(`Liegenschaft ${property.sourceKey} hat weder Kundennummer noch Adresse.`);
    }
  }

  for (const installation of bundle.installations) {
    if (!seen.has(installation.sourceKey)) {
      warnings.push(`Anlage ${installation.installationKey || '-'} verweist auf unbekannte Liegenschaft ${installation.sourceKey}.`);
    }
  }

  for (const work of bundle.plannedWork) {
    if (!seen.has(work.sourceKey)) {
      warnings.push(`Geplante Arbeit ${work.workKey || '-'} verweist auf unbekannte Liegenschaft ${work.sourceKey}.`);
    }
  }

  for (const invoice of bundle.invoices ?? []) {
    if (!seen.has(invoice.sourceKey)) {
      warnings.push(`Rechnung ${invoice.invoiceNumber || '-'} verweist auf unbekannte Liegenschaft ${invoice.sourceKey}.`);
    }
  }

  const invoiceSourceKeys = new Map((bundle.invoices ?? []).map((invoice) => [invoice.invoiceNumber, invoice.sourceKey]));

  for (const line of bundle.invoiceLines ?? []) {
    const sourceKey = line.sourceKey || invoiceSourceKeys.get(line.invoiceNumber) || '';
    if (sourceKey && !seen.has(sourceKey)) {
      warnings.push(`Rechnungsposition ${line.lineKey || '-'} verweist auf unbekannte Liegenschaft ${sourceKey}.`);
    }
  }

  for (const document of bundle.pdfDocuments ?? []) {
    const sourceKey = document.sourceKey || invoiceSourceKeys.get(document.invoiceNumber) || '';
    if (sourceKey && !seen.has(sourceKey)) {
      warnings.push(`PDF ${document.fileName || document.relativePath || '-'} verweist auf unbekannte Liegenschaft ${sourceKey}.`);
    }
  }

  for (const entry of bundle.history) {
    if (!seen.has(entry.sourceKey)) {
      warnings.push(`Historie ${entry.historyKey || '-'} verweist auf unbekannte Liegenschaft ${entry.sourceKey}.`);
    }
  }

  return warnings;
}

async function readAssetBase64(asset: DocumentPickerAsset): Promise<string> {
  if (asset.file && 'arrayBuffer' in asset.file) {
    const buffer = await asset.file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  return FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function parseJsonText(text: string): Promise<GenesisBundleV1> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Genesis-Bundle ist kein gueltiges JSON.');
  }

  if (!isBundle(parsed)) {
    throw new Error('Datei ist kein Genesis-Bundle im Format genesis-bundle.v1/v2.');
  }

  return parsed;
}

async function ensureDirectoryFor(fileUri: string): Promise<void> {
  const directory = fileUri.slice(0, fileUri.lastIndexOf('/'));
  if (!directory) {
    return;
  }
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
}

async function persistZipPdfs(zip: JSZip, documents: GenesisBundlePdfDocument[] | undefined): Promise<GenesisBundlePdfDocument[] | undefined> {
  if (!documents?.length || !FileSystem.documentDirectory) {
    return documents;
  }

  const baseDirectory = `${FileSystem.documentDirectory}genesis-pdfs/`;
  await FileSystem.makeDirectoryAsync(baseDirectory, { intermediates: true }).catch(() => undefined);

  const nextDocuments: GenesisBundlePdfDocument[] = [];
  for (const document of documents) {
    const entryName = document.relativePath || document.archivePath;
    const entry = entryName
      ? zip.file(entryName) ?? zip.file(new RegExp(`${entryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))[0]
      : null;
    if (!entry) {
      nextDocuments.push(document);
      continue;
    }
    const localUri = `${baseDirectory}${document.relativePath}`;
    await ensureDirectoryFor(localUri);
    await FileSystem.writeAsStringAsync(localUri, await entry.async('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });
    nextDocuments.push({ ...document, localUri });
  }

  return nextDocuments;
}

async function parseZipAsset(asset: DocumentPickerAsset): Promise<GenesisBundleV1> {
  const zip = await JSZip.loadAsync(await readAssetBase64(asset), { base64: true });
  const jsonEntry = zip.file(/(^|\/)genesis-export-v2\.json$/i)[0]
    ?? zip.file(/(^|\/)genesis-export-v1\.json$/i)[0]
    ?? zip.file(/(^|\/)genesis-export.*\.json$/i)[0];

  if (!jsonEntry) {
    throw new Error('Transport-ZIP enthaelt kein genesis-export-v2.json.');
  }

  const bundle = await parseJsonText(await jsonEntry.async('text'));
  return {
    ...bundle,
    pdfDocuments: await persistZipPdfs(zip, bundle.pdfDocuments),
  };
}

export async function parseGenesisBundleAsset(asset: DocumentPickerAsset): Promise<GenesisBundlePreview> {
  const isZip = asset.name.toLowerCase().endsWith('.zip') || asset.mimeType === 'application/zip';
  const parsed = isZip ? await parseZipAsset(asset) : await parseJsonText(await readAssetText(asset));
  const warnings = validateBundle(parsed);
  return {
    fileName: asset.name,
    bundle: parsed,
    warnings: [...parsed.metadata.warnings, ...warnings],
  };
}
