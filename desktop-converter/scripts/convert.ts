import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { convertGenesisZip } from '../src/genesisConverter.ts';

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3] ?? path.resolve('genesis-export-v2.json');

  if (!sourcePath) {
    throw new Error('Usage: npm run converter:convert -- /path/to/genesis-sicherung.zip [output.json]');
  }

  const result = await convertGenesisZip(sourcePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result.bundle, null, 2), 'utf8');

  const objectTariffSuggestions = result.bundle.plannedWork.filter((item) => item.source === 'objectTariff' || item.source === 'tariff').length;
  const invoiceLineSuggestions = result.bundle.plannedWork.filter((item) => item.source === 'invoiceLine').length;
  const arbvolSummary = result.bundle.plannedWork.filter((item) => item.source === 'arbvol').length;
  const documentCounts = result.bundle.metadata.documentCounts ?? {};

  console.log(`Genesis-Bundle geschrieben: ${outputPath}`);
  console.log(`Liegenschaften: ${result.bundle.properties.length}`);
  console.log(`Anlagen: ${result.bundle.installations.length}`);
  console.log(`Objekttarifvorschlaege: ${objectTariffSuggestions}`);
  console.log(`Rechnungspositionsvorschlaege: ${invoiceLineSuggestions}`);
  console.log(`Arbeitsvolumen: ${arbvolSummary}`);
  console.log(`Rechnungen: ${result.bundle.invoices?.length ?? 0}`);
  console.log(`Rechnungspositionen: ${result.bundle.invoiceLines?.length ?? 0}`);
  console.log(`Rechnung-PDFs: ${documentCounts.invoice ?? 0}`);
  console.log(`Rapport-PDFs: ${documentCounts.rapport ?? 0}`);
  console.log(`Historie: ${result.bundle.history.length}`);
  console.log(`Warnungen: ${result.bundle.metadata.warnings.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
