import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { ClipboardList, FileSpreadsheet, House } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '../../src/theme/theme';

function tabIcon(Icon: LucideIcon) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon color={color as string} size={23} strokeWidth={focused ? 2.4 : 2} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Start', tabBarIcon: tabIcon(House) }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Rapporte', tabBarIcon: tabIcon(ClipboardList) }}
      />
      <Tabs.Screen
        name="import"
        options={{ title: 'Import', tabBarIcon: tabIcon(FileSpreadsheet) }}
      />
    </Tabs>
  );
}
