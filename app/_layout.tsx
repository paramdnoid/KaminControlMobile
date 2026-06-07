import '../global.css';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from '../src/data/database';
import { colors } from '../src/theme/theme';

function HeaderBack() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Zurück"
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      className="flex-row items-center gap-0.5 -ml-1 pr-3 py-1"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      <ChevronLeft color={colors.primary} size={26} strokeWidth={2.25} />
      <Text className="text-base font-semibold text-primary">Zurück</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((initError) => {
        setError(initError instanceof Error ? initError.message : 'Datenbankfehler');
      });
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-background gap-3 p-6">
          <StatusBar style="dark" />
          {error ? (
            <Text className="text-base text-danger text-center">{error}</Text>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text className="text-base text-muted">Lokale Daten werden vorbereitet</Text>
            </>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerBackVisible: false,
          headerLeft: () => <HeaderBack />,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="property/[id]" options={{ title: 'Liegenschaft' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Rapport' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
