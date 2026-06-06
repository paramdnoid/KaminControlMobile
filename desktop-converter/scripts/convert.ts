import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { convertGenesisZip } from '../src/genesisConverter';

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3] ?? path.resolve('genesis-export-v1.json');

  if (!sourcePath) {
    throw new Error('Usage: npm run converter:convert -- /path/to/Daten.zip [output.json]');
  }

  const result = await convertGenesisZip(sourcePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result.bundle, null, 2), 'utf8');

  console.log(`Genesis-Bundle geschrieben: ${outputPath}`);
  console.log(`Liegenschaften: ${result.bundle.properties.length}`);
  console.log(`Anlagen: ${result.bundle.installations.length}`);
  console.log(`Geplante Arbeiten: ${result.bundle.plannedWork.length}`);
  console.log(`Historie: ${result.bundle.history.length}`);
  console.log(`Warnungen: ${result.bundle.metadata.warnings.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
