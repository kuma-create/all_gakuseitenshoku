// app/(student)/ipo/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'hooks/useColorScheme';
import { Colors } from 'constants/Colors';
import { HapticTab } from 'components/HapticTab';
import { IconSymbol } from 'components/ui/IconSymbol';
import { Feather } from '@expo/vector-icons';

export default function IPOLayout() {
  const colorScheme = useColorScheme();
  const common: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
    tabBarButton: (p) => <HapticTab {...p} />,
    tabBarBackground: undefined,
    tabBarStyle: Platform.select({
      ios: { position: 'absolute' },
      default: {},
    }),
    tabBarItemStyle: { display: 'none' },
  };

  return (
    <Tabs screenOptions={common}>
      <Tabs.Screen
        name="dashboard"
        options={{
          href: '/ipo/dashboard',
          title: 'ホーム',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
      <Tabs.Screen
        name="analysis/index"
        options={{
          href: '/ipo/analysis',
          title: '自己分析',
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
      <Tabs.Screen
        name="case/index"
        options={{
          href: '/ipo/case',
          title: 'ケース',
          tabBarIcon: ({ color }) => <Feather name="mail" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
      <Tabs.Screen
        name="diagnosis/index"
        options={{
          href: '/ipo/diagnosis',
          title: '診断',
          tabBarIcon: ({ color }) => <Feather name="message-circle" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          href: '/ipo/calendar',
          title: 'カレンダー',
          tabBarIcon: ({ color }) => <Feather name="book" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
    </Tabs>
  );
}