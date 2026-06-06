import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { FileSpreadsheet, ListChecks, Search } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { PropertyCard } from '../src/components/PropertyCard';
import { Screen } from '../src/components/Screen';
import { createReport, getDashboardStats, listProperties } from '../src/data/database';
import { colors, radius, spacing, typography } from '../src/theme/theme';
import type { CustomerProperty, DashboardStats } from '../src/types';

export default function HomeScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [properties, setProperties] = useState<CustomerProperty[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const load = useCallback(async (search = query) => {
    setLoading(true);
    const [nextStats, nextProperties] = await Promise.all([
      getDashboardStats(),
      listProperties(search, 40),
    ]);
    setStats(nextStats);
    setProperties(nextProperties);
    setLoading(false);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const subtitle = useMemo(() => {
    if (!stats?.properties) {
      return 'Stammdaten importieren und den ersten digitalen Rapport erfassen.';
    }
    return `${stats.properties} Liegenschaften lokal gespeichert`;
  }, [stats?.properties]);

  async function startReport(propertyId: string) {
    setCreatingFor(propertyId);
    try {
      const report = await createReport(propertyId);
      router.push({ pathname: '/report/[id]', params: { id: report.id } });
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <Screen title="KaminControl" subtitle={subtitle}>
      <View style={styles.actions}>
        <Button
          label="Stammdaten importieren"
          icon={FileSpreadsheet}
          onPress={() => router.push('/import')}
          variant="primary"
        />
        <Button
          label="Rapporte"
          icon={ListChecks}
          onPress={() => router.push('/reports')}
          variant="secondary"
        />
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Entwürfe" value={stats?.drafts ?? 0} />
        <Stat label="Abgeschlossen" value={stats?.completed ?? 0} />
        <Stat label="Exportiert" value={stats?.exported ?? 0} />
      </View>

      <Card compact>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={20} />
          <TextInput
            accessibilityLabel="Liegenschaften suchen"
            onChangeText={(value) => {
              setQuery(value);
              load(value);
            }}
            placeholder="Kundennummer, Ort, Strasse, Name"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={query}
          />
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : properties.length ? (
        <View style={styles.list}>
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onCreateReport={() => startReport(property.id)}
              onOpen={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
            />
          ))}
          {creatingFor ? <Text style={styles.saving}>Rapport wird angelegt...</Text> : null}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyTitle}>Keine Liegenschaften gefunden</Text>
          <Text style={styles.emptyText}>
            Importiere eine CSV- oder XLSX-Datei mit Kundennummer und Liegenschaftsadresse.
          </Text>
          <Button
            label="Import öffnen"
            icon={FileSpreadsheet}
            onPress={() => router.push('/import')}
            variant="primary"
          />
        </Card>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card compact>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  statLabel: {
    color: colors.muted,
    fontSize: typography.small,
    textAlign: 'center',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 48,
  },
  list: {
    gap: spacing.md,
  },
  saving: {
    color: colors.muted,
    fontSize: typography.small,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
  },
});
