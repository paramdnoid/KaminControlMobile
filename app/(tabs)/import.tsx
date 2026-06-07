import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { CheckCircle2, Database, FileJson2, FileSpreadsheet, UploadCloud } from 'lucide-react-native';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import { importGenesisBundle, upsertImportedProperties } from '../../src/data/database';
import { parseGenesisBundleAsset } from '../../src/import/genesisBundle';
import { IMPORT_TEMPLATE_HEADERS, parseImportAsset } from '../../src/import/importer';
import { colors } from '../../src/theme/theme';
import type { GenesisBundlePreview, GenesisImportResult, ImportPreview, ImportResult } from '../../src/types';
import { joinAddress } from '../../src/utils/text';

export default function ImportScreen() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [genesisPreview, setGenesisPreview] = useState<GenesisBundlePreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [genesisResult, setGenesisResult] = useState<GenesisImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [genesisLoading, setGenesisLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genesisSaving, setGenesisSaving] = useState(false);

  const objectTariffCount  = genesisPreview?.bundle.plannedWork.filter((i) => i.source === 'objectTariff').length ?? 0;
  const invoiceLineCount   = genesisPreview?.bundle.plannedWork.filter((i) => i.source === 'invoiceLine').length ?? 0;
  const arbvolCount        = genesisPreview?.bundle.plannedWork.filter((i) => i.source === 'arbvol').length ?? 0;

  async function pickFile() {
    setLoading(true); setResult(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        base64: true, copyToCacheDirectory: true, multiple: false,
        type: ['text/csv','text/comma-separated-values','application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });
      if (!picked.canceled && picked.assets[0]) {
        setPreview(await parseImportAsset(picked.assets[0]));
        setGenesisPreview(null);
      }
    } catch (e) {
      Alert.alert('Importfehler', e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden.');
    } finally { setLoading(false); }
  }

  async function pickGenesisBundle() {
    setGenesisLoading(true); setGenesisResult(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        base64: false, copyToCacheDirectory: true, multiple: false, type: '*/*',
      });
      if (!picked.canceled && picked.assets[0]) {
        setGenesisPreview(await parseGenesisBundleAsset(picked.assets[0]));
        setPreview(null);
      }
    } catch (e) {
      Alert.alert('Genesis-Importfehler', e instanceof Error ? e.message : 'Bundle konnte nicht gelesen werden.');
    } finally { setGenesisLoading(false); }
  }

  async function saveImport() {
    if (!preview) return;
    setSaving(true);
    try {
      setResult(await upsertImportedProperties(preview.candidates.map((c) => c.property)));
    } catch (e) {
      Alert.alert('Speichern fehlgeschlagen', e instanceof Error ? e.message : 'Import konnte nicht gespeichert werden.');
    } finally { setSaving(false); }
  }

  async function saveGenesisImport() {
    if (!genesisPreview) return;
    setGenesisSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      setGenesisResult(await importGenesisBundle(genesisPreview.bundle, genesisPreview.fileName));
      setGenesisPreview(null);
    } catch (e) {
      Alert.alert('Genesis-Speichern fehlgeschlagen', e instanceof Error ? e.message : 'Bundle konnte nicht gespeichert werden.');
    } finally { setGenesisSaving(false); }
  }

  return (
    <Screen title="Stammdatenimport" subtitle="CSV/XLSX oder ein vorbereitetes Genesis-Bundle lokal importieren.">
      <Card>
        <Text className="text-h3 font-bold text-ink">CSV / XLSX</Text>
        <Text className="text-base text-muted leading-6">Import aus einer kontrollierten Kunden-/Liegenschaftsliste.</Text>
        <Text className="text-base text-muted leading-6" numberOfLines={2}>
          {IMPORT_TEMPLATE_HEADERS.slice(0, 8).join(', ')}
          {IMPORT_TEMPLATE_HEADERS.length > 8 ? ` und ${IMPORT_TEMPLATE_HEADERS.length - 8} weitere` : ''}
        </Text>
        <Button label={preview ? 'Andere CSV/XLSX wählen' : 'CSV/XLSX wählen'} icon={UploadCloud} loading={loading} onPress={pickFile} variant="secondary" />
      </Card>

      <Card>
        <Text className="text-h3 font-bold text-ink">Genesis-Bundle</Text>
        <Text className="text-base text-muted leading-6">
          Importiert `genesis-export-v2.json` oder `genesis-mobile-export.zip` aus der Desktop-Converter-App.
        </Text>
        <Button label={genesisPreview ? 'Anderes Genesis-Bundle wählen' : 'Genesis-Bundle wählen'} icon={Database} loading={genesisLoading} onPress={pickGenesisBundle} variant="primary" />
      </Card>

      {preview ? (
        <>
          <SectionHeader title="Vorschau" meta={`${preview.candidates.length} von ${preview.totalRows} Zeilen importierbar`} />
          <Card>
            <MetricGrid>
              <Metric label="Datei" value={preview.fileName} />
              <Metric label="Übersprungen" value={`${preview.skippedRows.length}`} />
            </MetricGrid>
            {preview.candidates.slice(0, 6).map((c) => (
              <View key={`${c.rowNumber}-${c.property.customerNumber}`} className="border-t border-divider pt-3 gap-1">
                <Text className="text-base font-semibold text-ink">{c.property.customerNumber || `Zeile ${c.rowNumber}`}</Text>
                <Text className="text-small text-muted">{c.property.propertyLabel || joinAddress(c.property.street, c.property.postalCode, c.property.city)}</Text>
                {c.warnings.length ? <Text className="text-small text-warning font-semibold">{c.warnings.join(' ')}</Text> : null}
              </View>
            ))}
            {preview.candidates.length > 6 ? (
              <Text className="text-base text-muted leading-6">Weitere {preview.candidates.length - 6} Zeilen werden mit importiert.</Text>
            ) : null}
            <Button label="Import speichern" icon={FileSpreadsheet} loading={saving} onPress={saveImport} variant="primary" />
          </Card>
        </>
      ) : null}

      {genesisPreview ? (
        <>
          <SectionHeader title="Genesis-Vorschau" meta={`${genesisPreview.bundle.properties.length} Liegenschaften im Bundle`} />
          <Card>
            <MetricGrid>
              <Metric label="Datei"             value={genesisPreview.fileName} />
              <Metric label="Anlagen"           value={`${genesisPreview.bundle.installations.length}`} />
              <Metric label="Objekttarife"      value={`${objectTariffCount}`} />
              <Metric label="Rechnungsvorschl." value={`${invoiceLineCount}`} />
              <Metric label="Rechnungen"        value={`${genesisPreview.bundle.invoices?.length ?? 0}`} />
              <Metric label="PDFs"              value={`${genesisPreview.bundle.pdfDocuments?.length ?? 0}`} />
              <Metric label="Arbeitsvolumen"    value={`${arbvolCount}`} />
              <Metric label="Historie"          value={`${genesisPreview.bundle.history.length}`} />
            </MetricGrid>
            {genesisPreview.warnings.slice(0, 5).map((w) => (
              <Text key={w} className="text-small text-warning font-semibold">{w}</Text>
            ))}
            {genesisPreview.warnings.length > 5 ? (
              <Text className="text-base text-muted leading-6">Weitere {genesisPreview.warnings.length - 5} Warnungen werden im Importlauf gespeichert.</Text>
            ) : null}
            <Button label={genesisSaving ? 'Genesis-Import läuft…' : 'Genesis-Bundle importieren'} icon={FileJson2} loading={genesisSaving} onPress={saveGenesisImport} variant="primary" />
            {genesisSaving ? (
              <Text className="text-base text-muted leading-6">Import wird lokal gespeichert. Bei grossen Genesis-Bundles kann das einen Moment dauern.</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {result ? (
        <Card>
          <View className="flex-row items-center gap-2">
            <CheckCircle2 color={colors.success} size={22} strokeWidth={2} />
            <Text className="text-h3 font-bold text-ink">Import gespeichert</Text>
          </View>
          <MetricGrid>
            <Metric label="Neu"          value={`${result.inserted}`} />
            <Metric label="Aktualisiert" value={`${result.updated}`} />
            <Metric label="Übersprungen" value={`${result.skipped}`} />
          </MetricGrid>
          <Button label="Zur Liegenschaftssuche" onPress={() => router.replace('/')} variant="secondary" />
        </Card>
      ) : null}

      {genesisResult ? (
        <Card>
          <View className="flex-row items-center gap-2">
            <CheckCircle2 color={colors.success} size={22} strokeWidth={2} />
            <Text className="text-h3 font-bold text-ink">Genesis-Import gespeichert</Text>
          </View>
          <MetricGrid>
            <Metric label="Neu"          value={`${genesisResult.inserted}`} />
            <Metric label="Aktualisiert" value={`${genesisResult.updated}`} />
            <Metric label="Inaktiv"      value={`${genesisResult.inactive}`} />
            <Metric label="Anlagen"      value={`${genesisResult.installations}`} />
            <Metric label="Vorschläge"   value={`${genesisResult.plannedWork}`} />
            <Metric label="Rechnungen"   value={`${genesisResult.invoices}`} />
            <Metric label="Positionen"   value={`${genesisResult.invoiceLines}`} />
            <Metric label="PDFs"         value={`${genesisResult.pdfDocuments}`} />
            <Metric label="Historie"     value={`${genesisResult.history}`} />
          </MetricGrid>
          <Button label="Zur Liegenschaftssuche" onPress={() => router.replace('/')} variant="secondary" />
        </Card>
      ) : null}
    </Screen>
  );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-surface-muted rounded-md flex-grow min-w-[110px] p-3 gap-0.5">
      <Text className="text-h3 font-bold text-ink leading-[22px]" numberOfLines={2}>{value}</Text>
      <Text className="text-small text-muted leading-[18px]">{label}</Text>
    </View>
  );
}
