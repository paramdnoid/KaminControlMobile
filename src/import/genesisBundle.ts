import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import type { GenesisBundlePreview, GenesisBundleV1 } from '../types';

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
    candidate?.schemaVersion === 'genesis-bundle.v1' &&
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

  for (const entry of bundle.history) {
    if (!seen.has(entry.sourceKey)) {
      warnings.push(`Historie ${entry.historyKey || '-'} verweist auf unbekannte Liegenschaft ${entry.sourceKey}.`);
    }
  }

  return warnings;
}

export async function parseGenesisBundleAsset(asset: DocumentPickerAsset): Promise<GenesisBundlePreview> {
  const text = await readAssetText(asset);
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Genesis-Bundle ist kein gueltiges JSON.');
  }

  if (!isBundle(parsed)) {
    throw new Error('Datei ist kein Genesis-Bundle im Format genesis-bundle.v1.');
  }

  const warnings = validateBundle(parsed);
  return {
    fileName: asset.name,
    bundle: parsed,
    warnings: [...parsed.metadata.warnings, ...warnings],
  };
}
