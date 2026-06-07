import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  CheckCircle2,
  Database,
  FilePlus2,
  FileSpreadsheet,
  Search,
  Share2,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { PropertyCard } from '../../src/components/PropertyCard';
import { Screen } from '../../src/components/Screen';
import { createReport, getDashboardStats, listProperties } from '../../src/data/database';
import { colors, shadow } from '../../src/theme/theme';
import type { CustomerProperty, DashboardStats } from '../../src/types';

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
    <Screen eyebrow="Kaminfeger-Rapporte" title="KaminControl" subtitle={subtitle}>
      {/* Stats — single unified panel, 2×2 with dividers */}
      <View
        className="bg-surface rounded-lg border border-border overflow-hidden"
        style={shadow.card}
      >
        <View className="flex-row">
          <Stat icon={Database} label="Genesis-Importe" value={stats?.genesisImports ?? 0} />
          <View className="w-px bg-divider" />
          <Stat icon={FilePlus2} label="Entwürfe" value={stats?.drafts ?? 0} />
        </View>
        <View className="h-px bg-divider" />
        <View className="flex-row">
          <Stat icon={CheckCircle2} label="Abgeschlossen" value={stats?.completed ?? 0} />
          <View className="w-px bg-divider" />
          <Stat icon={Share2} label="Exportiert" value={stats?.exported ?? 0} />
        </View>
      </View>

      {/* Search bar */}
      <View
        className="flex-row items-center gap-2.5 bg-surface rounded-lg border border-border min-h-[52px] px-4"
        style={shadow.card}
      >
        <Search color={colors.mutedLight} size={18} strokeWidth={2.5} />
        <TextInput
          accessibilityLabel="Liegenschaften suchen"
          onChangeText={(value) => { setQuery(value); load(value); }}
          placeholder="Kundennummer, Ort, Strasse, Name"
          placeholderTextColor={colors.mutedLight}
          className="flex-1 text-base text-ink min-h-[52px]"
          value={query}
        />
      </View>

      {/* Property list */}
      {loading ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : properties.length ? (
        <View className="gap-2.5">
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
          <View className="w-12 h-12 items-center justify-center rounded-full bg-primary-soft">
            <FileSpreadsheet color={colors.primary} size={22} strokeWidth={2} />
          </View>
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

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <View className="flex-1 items-center gap-1 py-5 px-2">
      <Icon color={colors.mutedLight} size={17} strokeWidth={2} />
      <Text className="text-display font-extrabold text-primary text-center tracking-tighter">
        {value}
      </Text>
      <Text className="text-eyebrow font-semibold text-muted text-center uppercase">
        {label}
      </Text>
    </View>
  );
}
