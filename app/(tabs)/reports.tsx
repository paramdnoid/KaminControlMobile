import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chips } from '../../src/components/Chips';
import { ReportCard } from '../../src/components/ReportCard';
import { Screen } from '../../src/components/Screen';
import { listReports } from '../../src/data/database';
import { colors } from '../../src/theme/theme';
import type { ReportBundle, ReportStatus } from '../../src/types';

const filters: Array<{ value: ReportStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'Alle' },
  { value: 'draft',     label: 'Entwürfe' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'exported',  label: 'Exportiert' },
];

export default function ReportsScreen() {
  const [reports, setReports] = useState<ReportBundle[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReports(await listReports(filter === 'all' ? undefined : filter));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Laden fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  return (
    <Screen title="Rapporte" subtitle="Entwürfe, abgeschlossene Rapporte und exportierte Übergaben.">
      <Chips
        multi={false}
        options={filters}
        selected={[filter]}
        onChange={(selected) => setFilter(selected[0] ?? 'all')}
      />

      {loadError ? (
        <Card>
          <Text className="text-h3 font-bold text-ink">Fehler beim Laden</Text>
          <Text className="text-base text-muted leading-6">{loadError}</Text>
          <Button label="Erneut versuchen" onPress={load} variant="secondary" />
        </Card>
      ) : loading ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : reports.length ? (
        <View className="gap-2">
          {reports.map((bundle) => (
            <ReportCard
              key={bundle.report.id}
              bundle={bundle}
              onOpen={() => router.push({ pathname: '/report/[id]', params: { id: bundle.report.id } })}
            />
          ))}
        </View>
      ) : (
        <Card>
          <Text className="text-base text-muted">Keine Rapporte in dieser Ansicht.</Text>
        </Card>
      )}
    </Screen>
  );
}
