import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, FileJson2, FileText, Plus, Share2, Trash2 } from 'lucide-react-native';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Field } from '../../src/components/Field';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  completeReport,
  getGenesisContext,
  getReportBundle,
  markReportExported,
  saveReport,
} from '../../src/data/database';
import {
  buildStructuredReport,
  shareReportPdf,
} from '../../src/pdf/reportPdf';
import { colors, spacing, typography } from '../../src/theme/theme';
import type { GenesisPropertyContext, ReportBundle, ServiceReport, WorkItem } from '../../src/types';
import { createId } from '../../src/utils/id';
import { joinAddress } from '../../src/utils/text';

type FormErrors = {
  cleaningDate?: string;
  chimneySweepName?: string;
};

function emptyWorkItem(reportId: string, sortOrder: number): WorkItem {
  return {
    id: createId('item'),
    reportId,
    quantity: '',
    description: '',
    tp: '',
    amount: '',
    minutes: '',
    sortOrder,
  };
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [genesisContext, setGenesisContext] = useState<GenesisPropertyContext | null>(null);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showJson, setShowJson] = useState(false);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    const nextBundle = await getReportBundle(id);
    const nextGenesisContext = nextBundle ? await getGenesisContext(nextBundle.property.id) : null;
    setBundle(nextBundle);
    setGenesisContext(nextGenesisContext);
    setReport(nextBundle?.report ?? null);
    setWorkItems(
      nextBundle?.workItems.length
        ? nextBundle.workItems
        : nextBundle?.report
          ? [emptyWorkItem(nextBundle.report.id, 0)]
          : [],
    );
    hydrated.current = true;
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!hydrated.current || !report) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      saveReport(report, workItems)
        .then(() => setSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })))
        .catch((error) => {
          console.warn('Autosave failed', error);
        });
    }, 700);

    return () => clearTimeout(timeout);
  }, [report, workItems]);

  const structuredJson = useMemo(() => {
    if (!bundle || !report) {
      return '';
    }
    return buildStructuredReport({ ...bundle, report, workItems: cleanWorkItems(workItems) });
  }, [bundle, report, workItems]);

  function updateReport(patch: Partial<ServiceReport>) {
    setReport((current) => (current ? { ...current, ...patch } : current));
  }

  function updateWorkItem(index: number, patch: Partial<WorkItem>) {
    setWorkItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function removeWorkItem(index: number) {
    setWorkItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addWorkItem() {
    if (!report) {
      return;
    }
    setWorkItems((current) => [...current, emptyWorkItem(report.id, current.length)]);
  }

  function applyPlannedWork() {
    if (!report || !genesisContext?.plannedWork.length) {
      return;
    }

    const mapped = genesisContext.plannedWork.map((work, index) => ({
      id: createId('item'),
      reportId: report.id,
      quantity: work.quantity,
      description: work.description || work.notes || 'Geplante Genesis-Arbeit',
      tp: work.tp,
      amount: work.amount,
      minutes: work.minutes,
      sortOrder: index,
    }));

    setWorkItems((current) => {
      const currentHasContent = cleanWorkItems(current).length > 0;
      const nextItems = currentHasContent ? [...current, ...mapped] : mapped;
      return nextItems.map((item, index) => ({ ...item, sortOrder: index }));
    });
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!report?.cleaningDate) {
      nextErrors.cleaningDate = 'Datum ist erforderlich.';
    }
    if (!report?.chimneySweepName.trim()) {
      nextErrors.chimneySweepName = 'Name des Kaminfegers ist erforderlich.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function finishReport() {
    if (!report || !validate()) {
      return;
    }

    setBusy(true);
    try {
      await completeReport(report, cleanWorkItems(workItems));
      await load();
    } catch (error) {
      Alert.alert('Abschluss fehlgeschlagen', error instanceof Error ? error.message : 'Rapport konnte nicht abgeschlossen werden.');
    } finally {
      setBusy(false);
    }
  }

  async function sharePdf() {
    if (!bundle || !report) {
      return;
    }

    setBusy(true);
    try {
      await saveReport(report, cleanWorkItems(workItems));
      await shareReportPdf({ ...bundle, report, workItems: cleanWorkItems(workItems) });
    } catch (error) {
      Alert.alert('PDF fehlgeschlagen', error instanceof Error ? error.message : 'PDF konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function exportDone() {
    if (!report) {
      return;
    }

    setBusy(true);
    try {
      await markReportExported(report.id);
      await load();
    } catch (error) {
      Alert.alert('Status fehlgeschlagen', error instanceof Error ? error.message : 'Status konnte nicht gesetzt werden.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Rapport">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!bundle || !report) {
    return (
      <Screen title="Rapport">
        <Card>
          <Text style={styles.title}>Nicht gefunden</Text>
          <Button label="Zurück" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const property = bundle.property;
  const isCompleted = report.status === 'completed' || report.status === 'exported';

  return (
    <Screen
      title={isCompleted ? 'Rapport' : 'Rapport erfassen'}
      subtitle={savedAt ? `Automatisch gespeichert ${savedAt}` : 'Lokaler Entwurf'}
      footer={
        isCompleted ? (
          <View style={styles.footerActions}>
            <Button label="PDF teilen" icon={Share2} loading={busy} onPress={sharePdf} variant="primary" />
            {report.status !== 'exported' ? (
              <Button label="Als exportiert markieren" icon={CheckCircle2} onPress={exportDone} variant="secondary" />
            ) : null}
          </View>
        ) : (
          <Button label="Rapport abschliessen" icon={CheckCircle2} loading={busy} onPress={finishReport} variant="primary" />
        )
      }
    >
      <Card>
        <View style={styles.statusLine}>
          <Text style={styles.status}>{statusLabel(report.status)}</Text>
          <Text style={styles.meta}>{property.customerNumber ? `Kundennummer ${property.customerNumber}` : ''}</Text>
        </View>
        <Text style={styles.title}>{property.propertyLabel || property.street || 'Liegenschaft'}</Text>
        <Text style={styles.meta}>{joinAddress(property.street, property.postalCode, property.city)}</Text>
      </Card>

      <SectionHeader title="Termin" />
      <Card>
        <Field
          error={errors.cleaningDate}
          label="Datum Reinigung"
          onChangeText={(value) => updateReport({ cleaningDate: value })}
          placeholder="2026-06-06"
          value={report.cleaningDate}
        />
        <View style={styles.twoCols}>
          <Field
            containerStyle={styles.flexField}
            label="Uhrzeit von"
            onChangeText={(value) => updateReport({ timeFrom: value })}
            placeholder="08:00"
            value={report.timeFrom}
          />
          <Field
            containerStyle={styles.flexField}
            label="bis"
            onChangeText={(value) => updateReport({ timeTo: value })}
            placeholder="09:30"
            value={report.timeTo}
          />
        </View>
      </Card>

      <SectionHeader title="Arbeiten vor Ort" meta={`${cleanWorkItems(workItems).length} Positionen mit Inhalt`} />
      {!isCompleted && genesisContext?.plannedWork.length ? (
        <Card compact>
          <Text style={styles.meta}>
            {genesisContext.plannedWork.length} geplante Genesis-Positionen fuer diese Liegenschaft verfuegbar.
          </Text>
          <Button label="Geplante Arbeiten übernehmen" icon={Plus} onPress={applyPlannedWork} variant="secondary" />
        </Card>
      ) : null}
      <View style={styles.list}>
        {workItems.map((item, index) => (
          <Card key={item.id}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>Position {index + 1}</Text>
              {workItems.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Position ${index + 1} löschen`}
                  onPress={() => removeWorkItem(index)}
                  style={styles.iconButton}
                >
                  <Trash2 color={colors.danger} size={20} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.twoCols}>
              <Field
                containerStyle={styles.flexField}
                keyboardType="number-pad"
                label="Anzahl"
                onChangeText={(value) => updateWorkItem(index, { quantity: value })}
                value={item.quantity}
              />
              <Field
                containerStyle={styles.flexField}
                keyboardType="decimal-pad"
                label="Min."
                onChangeText={(value) => updateWorkItem(index, { minutes: value })}
                value={item.minutes}
              />
            </View>
            <Field
              label="Bezeichnung"
              onChangeText={(value) => updateWorkItem(index, { description: value })}
              placeholder="Ausgeführte Arbeit"
              value={item.description}
            />
            <View style={styles.twoCols}>
              <Field
                containerStyle={styles.flexField}
                label="TP"
                onChangeText={(value) => updateWorkItem(index, { tp: value })}
                value={item.tp}
              />
              <Field
                containerStyle={styles.flexField}
                keyboardType="decimal-pad"
                label="Betrag"
                onChangeText={(value) => updateWorkItem(index, { amount: value })}
                value={item.amount}
              />
            </View>
          </Card>
        ))}
      </View>
      <Button label="Position hinzufügen" icon={Plus} onPress={addWorkItem} variant="secondary" />

      <SectionHeader title="Bemerkungen und Abschluss" />
      <Card>
        <Field
          label="Bemerkungen"
          multiline
          numberOfLines={4}
          onChangeText={(value) => updateReport({ notes: value })}
          style={styles.textArea}
          textAlignVertical="top"
          value={report.notes}
        />
        <Field
          error={errors.chimneySweepName}
          label="Name Kaminfeger"
          onChangeText={(value) => updateReport({ chimneySweepName: value })}
          value={report.chimneySweepName}
        />
      </Card>

      {isCompleted ? (
        <Card>
          <View style={styles.doneHeader}>
            <FileText color={colors.primary} size={22} />
            <Text style={styles.title}>Übergabe ans Büro</Text>
          </View>
          <Button label="PDF teilen" icon={Share2} loading={busy} onPress={sharePdf} variant="primary" />
          <Button
            label={showJson ? 'Strukturierte Daten ausblenden' : 'Strukturierte Daten anzeigen'}
            icon={FileJson2}
            onPress={() => setShowJson((current) => !current)}
            variant="ghost"
          />
          {showJson ? (
            <Text selectable style={styles.json}>{structuredJson}</Text>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

function cleanWorkItems(items: WorkItem[]): WorkItem[] {
  return items
    .filter((item) =>
      [item.quantity, item.description, item.tp, item.amount, item.minutes].some((value) => value.trim()),
    )
    .map((item, index) => ({ ...item, sortOrder: index }));
}

function statusLabel(status: ServiceReport['status']): string {
  if (status === 'exported') {
    return 'Exportiert';
  }
  if (status === 'completed') {
    return 'Abgeschlossen';
  }
  return 'Entwurf';
}

const styles = StyleSheet.create({
  footerActions: {
    gap: spacing.sm,
  },
  statusLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  status: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  twoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexField: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  textArea: {
    minHeight: 112,
  },
  doneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  json: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
    padding: spacing.md,
  },
});
