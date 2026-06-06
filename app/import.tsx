import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { CheckCircle2, Database, FileJson2, FileSpreadsheet, UploadCloud } from 'lucide-react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { SectionHeader } from '../src/components/SectionHeader';
import { importGenesisBundle, upsertImportedProperties } from '../src/data/database';
import { parseGenesisBundleAsset } from '../src/import/genesisBundle';
import { IMPORT_TEMPLATE_HEADERS, parseImportAsset } from '../src/import/importer';
import { colors, spacing, typography } from '../src/theme/theme';
import type { GenesisBundlePreview, GenesisImportResult, ImportPreview, ImportResult } from '../src/types';
import { joinAddress } from '../src/utils/text';

export default function ImportScreen() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [genesisPreview, setGenesisPreview] = useState<GenesisBundlePreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [genesisResult, setGenesisResult] = useState<GenesisImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [genesisLoading, setGenesisLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genesisSaving, setGenesisSaving] = useState(false);
  const tariffSuggestionCount = genesisPreview?.bundle.plannedWork.filter((item) => item.source === 'tariff').length ?? 0;
  const arbvolCount = genesisPreview?.bundle.plannedWork.filter((item) => item.source === 'arbvol').length ?? 0;

  async function pickFile() {
    setLoading(true);
    setResult(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        base64: true,
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      if (!picked.canceled && picked.assets[0]) {
        setPreview(await parseImportAsset(picked.assets[0]));
        setGenesisPreview(null);
      }
    } catch (error) {
      Alert.alert('Importfehler', error instanceof Error ? error.message : 'Datei konnte nicht gelesen werden.');
    } finally {
      setLoading(false);
    }
  }

  async function pickGenesisBundle() {
    setGenesisLoading(true);
    setGenesisResult(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/json', 'text/plain'],
      });

      if (!picked.canceled && picked.assets[0]) {
        setGenesisPreview(await parseGenesisBundleAsset(picked.assets[0]));
        setPreview(null);
      }
    } catch (error) {
      Alert.alert('Genesis-Importfehler', error instanceof Error ? error.message : 'Genesis-Bundle konnte nicht gelesen werden.');
    } finally {
      setGenesisLoading(false);
    }
  }

  async function saveImport() {
    if (!preview) {
      return;
    }

    setSaving(true);
    try {
      const nextResult = await upsertImportedProperties(
        preview.candidates.map((candidate) => candidate.property),
      );
      setResult(nextResult);
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', error instanceof Error ? error.message : 'Import konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  async function saveGenesisImport() {
    if (!genesisPreview) {
      return;
    }

    setGenesisSaving(true);
    try {
      const nextResult = await importGenesisBundle(genesisPreview.bundle, genesisPreview.fileName);
      setGenesisResult(nextResult);
    } catch (error) {
      Alert.alert('Genesis-Speichern fehlgeschlagen', error instanceof Error ? error.message : 'Genesis-Bundle konnte nicht gespeichert werden.');
    } finally {
      setGenesisSaving(false);
    }
  }

  return (
    <Screen
      title="Stammdatenimport"
      subtitle="CSV/XLSX oder ein vorbereitetes Genesis-Bundle lokal importieren."
    >
      <Card>
        <Text style={styles.label}>CSV/XLSX</Text>
        <Text style={styles.text}>Import aus einer kontrollierten Kunden-/Liegenschaftsliste.</Text>
        <Text style={styles.text}>{IMPORT_TEMPLATE_HEADERS.join(', ')}</Text>
        <Button
          label={preview ? 'Andere CSV/XLSX wählen' : 'CSV/XLSX wählen'}
          icon={UploadCloud}
          loading={loading}
          onPress={pickFile}
          variant="secondary"
        />
      </Card>

      <Card>
        <Text style={styles.label}>Genesis-Bundle</Text>
        <Text style={styles.text}>
          Importiert `genesis-export-v1.json` aus der Desktop-Converter-App. MDB-Dateien bleiben ausserhalb der Mobile-App.
        </Text>
        <Button
          label={genesisPreview ? 'Anderes Genesis-Bundle wählen' : 'Genesis-Bundle wählen'}
          icon={Database}
          loading={genesisLoading}
          onPress={pickGenesisBundle}
          variant="primary"
        />
      </Card>

      {preview ? (
        <>
          <SectionHeader
            title="Vorschau"
            meta={`${preview.candidates.length} von ${preview.totalRows} Zeilen importierbar`}
          />
          <Card>
            <View style={styles.resultGrid}>
              <Metric label="Datei" value={preview.fileName} />
              <Metric label="Übersprungen" value={`${preview.skippedRows.length}`} />
            </View>
            {preview.candidates.slice(0, 6).map((candidate) => (
              <View key={`${candidate.rowNumber}-${candidate.property.customerNumber}`} style={styles.previewRow}>
                <Text style={styles.previewTitle}>
                  {candidate.property.customerNumber || `Zeile ${candidate.rowNumber}`}
                </Text>
                <Text style={styles.previewMeta}>
                  {candidate.property.propertyLabel || joinAddress(
                    candidate.property.street,
                    candidate.property.postalCode,
                    candidate.property.city,
                  )}
                </Text>
                {candidate.warnings.length ? (
                  <Text style={styles.warning}>{candidate.warnings.join(' ')}</Text>
                ) : null}
              </View>
            ))}
            {preview.candidates.length > 6 ? (
              <Text style={styles.text}>Weitere {preview.candidates.length - 6} Zeilen werden mit importiert.</Text>
            ) : null}
            <Button
              label="Import speichern"
              icon={FileSpreadsheet}
              loading={saving}
              onPress={saveImport}
              variant="primary"
            />
          </Card>
        </>
      ) : null}

      {genesisPreview ? (
        <>
          <SectionHeader
            title="Genesis-Vorschau"
            meta={`${genesisPreview.bundle.properties.length} Liegenschaften im Bundle`}
          />
          <Card>
            <View style={styles.resultGrid}>
              <Metric label="Datei" value={genesisPreview.fileName} />
              <Metric label="Anlagen" value={`${genesisPreview.bundle.installations.length}`} />
              <Metric label="Tarifvorschläge" value={`${tariffSuggestionCount}`} />
              <Metric label="Arbeitsvolumen" value={`${arbvolCount}`} />
              <Metric label="Historie" value={`${genesisPreview.bundle.history.length}`} />
            </View>
            <View style={styles.tableCounts}>
              {Object.entries(genesisPreview.bundle.metadata.tableCounts).slice(0, 8).map(([table, count]) => (
                <Text key={table} style={styles.countLine}>{table}: {count}</Text>
              ))}
            </View>
            {genesisPreview.warnings.slice(0, 5).map((warning) => (
              <Text key={warning} style={styles.warning}>{warning}</Text>
            ))}
            {genesisPreview.warnings.length > 5 ? (
              <Text style={styles.text}>Weitere {genesisPreview.warnings.length - 5} Warnungen werden im Importlauf gespeichert.</Text>
            ) : null}
            <Button
              label="Genesis-Bundle importieren"
              icon={FileJson2}
              loading={genesisSaving}
              onPress={saveGenesisImport}
              variant="primary"
            />
          </Card>
        </>
      ) : null}

      {result ? (
        <Card>
          <View style={styles.doneHeader}>
            <CheckCircle2 color={colors.success} size={24} />
            <Text style={styles.doneTitle}>Import gespeichert</Text>
          </View>
          <View style={styles.resultGrid}>
            <Metric label="Neu" value={`${result.inserted}`} />
            <Metric label="Aktualisiert" value={`${result.updated}`} />
            <Metric label="Übersprungen" value={`${result.skipped}`} />
          </View>
          <Button label="Zur Suche" onPress={() => router.replace('/')} variant="secondary" />
        </Card>
      ) : null}

      {genesisResult ? (
        <Card>
          <View style={styles.doneHeader}>
            <CheckCircle2 color={colors.success} size={24} />
            <Text style={styles.doneTitle}>Genesis-Import gespeichert</Text>
          </View>
          <View style={styles.resultGrid}>
            <Metric label="Neu" value={`${genesisResult.inserted}`} />
            <Metric label="Aktualisiert" value={`${genesisResult.updated}`} />
            <Metric label="Inaktiv" value={`${genesisResult.inactive}`} />
            <Metric label="Anlagen" value={`${genesisResult.installations}`} />
            <Metric label="Vorschläge" value={`${genesisResult.plannedWork}`} />
            <Metric label="Historie" value={`${genesisResult.history}`} />
          </View>
          <Button label="Zur Suche" onPress={() => router.replace('/')} variant="secondary" />
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={2}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  text: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: 120,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: typography.small,
  },
  previewRow: {
    borderColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  previewTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  previewMeta: {
    color: colors.muted,
    fontSize: typography.small,
  },
  warning: {
    color: colors.warning,
    fontSize: typography.small,
    fontWeight: '700',
  },
  tableCounts: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: spacing.xs,
    padding: spacing.md,
  },
  countLine: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
  doneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  doneTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
});
