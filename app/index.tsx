import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { FileSpreadsheet, ListChecks, Search } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { PropertyCard } from '../src/components/PropertyCard';
import { Screen } from '../src/components/Screen';
import { createReport, getDashboardStats, listProperties } from '../src/data/database';
import { colors, shadow } from '../src/theme/theme';
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
    useCallback(() => { load(); }, [load]),
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
      {/* Primary actions */}
      <View className="flex-row flex-wrap gap-2">
        <View className="flex-1 min-w-[140px]">
          <Button
            label="Stammdaten importieren"
            icon={FileSpreadsheet}
            onPress={() => router.push('/import')}
            variant="primary"
          />
        </View>
        <View className="flex-1 min-w-[140px]">
          <Button
            label="Rapporte"
            icon={ListChecks}
            onPress={() => router.push('/reports')}
            variant="secondary"
          />
        </View>
      </View>

      {/* Stats — guaranteed 2×2 grid */}
      <View className="gap-2">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Stat label="Genesis-Importe" value={stats?.genesisImports ?? 0} />
          </View>
          <View className="flex-1">
            <Stat label="Entwürfe" value={stats?.drafts ?? 0} />
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Stat label="Abgeschlossen" value={stats?.completed ?? 0} />
          </View>
          <View className="flex-1">
            <Stat label="Exportiert" value={stats?.exported ?? 0} />
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View
        className="flex-row items-center gap-2 bg-surface rounded-md border border-border min-h-[48px] px-3"
        style={shadow.card}
      >
        <Search color={colors.mutedLight} size={18} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Liegenschaften suchen"
          onChangeText={(value) => { setQuery(value); load(value); }}
          placeholder="Kundennummer, Ort, Strasse, Name"
          placeholderTextColor={colors.mutedLight}
          className="flex-1 text-base text-ink min-h-[48px]"
          value={query}
        />
      </View>

      {/* Property list */}
      {loading ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : properties.length ? (
        <View className="gap-2">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onCreateReport={() => startReport(property.id)}
              onOpen={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
            />
          ))}
          {creatingFor ? (
            <Text className="text-small text-muted text-center">Rapport wird angelegt…</Text>
          ) : null}
        </View>
      ) : (
        <Card>
          <Text className="text-h3 font-bold text-ink">Keine Liegenschaften gefunden</Text>
          <Text className="text-base text-muted leading-6">
            Importiere eine CSV/XLSX-Datei oder ein Genesis-Bundle mit Kundennummer und Liegenschaftsadresse.
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
      <Text className="text-display font-extrabold text-primary text-center tracking-tighter leading-9">
        {value}
      </Text>
      <Text className="text-small font-medium text-muted text-center leading-[18px]">
        {label}
      </Text>
    </Card>
  );
}
