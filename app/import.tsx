import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { SectionHeader } from '../src/components/SectionHeader';
import { upsertImportedProperties } from '../src/data/database';
import { IMPORT_TEMPLATE_HEADERS, parseImportAsset } from '../src/import/importer';
import { colors, spacing, typography } from '../src/theme/theme';
import type { ImportPreview, ImportResult } from '../src/types';
import { joinAddress } from '../src/utils/text';

export default function ImportScreen() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      }
    } catch (error) {
      Alert.alert('Importfehler', error instanceof Error ? error.message : 'Datei konnte nicht gelesen werden.');
    } finally {
      setLoading(false);
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

  return (
    <Screen
      title="Stammdatenimport"
      subtitle="CSV oder XLSX aus einer kontrollierten Kunden-/Liegenschaftsliste."
    >
      <Card>
        <Text style={styles.label}>Erwartete Spalten</Text>
        <Text style={styles.text}>{IMPORT_TEMPLATE_HEADERS.join(', ')}</Text>
        <Button
          label={preview ? 'Andere Datei wählen' : 'Datei wählen'}
          icon={UploadCloud}
          loading={loading}
          onPress={pickFile}
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
