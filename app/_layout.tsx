import '../global.css';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from '../src/data/database';
import { colors } from '../src/theme/theme';

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
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="import" options={{ title: 'Import' }} />
        <Stack.Screen name="reports" options={{ title: 'Rapporte' }} />
        <Stack.Screen name="property/[id]" options={{ title: 'Liegenschaft' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Rapport' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
