// app/(student)/ipo/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'hooks/useColorScheme';
import { Colors } from 'constants/Colors';
import { HapticTab } from 'components/HapticTab';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function IPOLayout() {
  const colorScheme = useColorScheme();
  const common: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: '#3B82F6', // blue-500
    tabBarInactiveTintColor: '#9CA3AF', // gray-400
    tabBarButton: (p) => <HapticTab {...p} />,
    // フッターは透過させない
    tabBarStyle: Platform.select({
      ios: { position: 'absolute', backgroundColor: '#fff', borderTopColor: '#e5e7eb', borderTopWidth: 1 },
      default: { backgroundColor: '#fff', borderTopColor: '#e5e7eb', borderTopWidth: 1 },
    }),
    tabBarLabelStyle: { fontSize: 11 },
    tabBarItemStyle: { display: 'none' },
  };

  return (
    <Tabs screenOptions={common}>
      {/* ホーム */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: '/ipo/dashboard',
          title: 'ホーム',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />

      {/* 自己分析 */}
      <Tabs.Screen
        name="analysis/index"
        options={{
          href: '/ipo/analysis',
          title: '自己分析',
          // 近いアイコンとして "cpu" を使用（Feather に brain は無いため）
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="brain" size={24} color={color} />
          ),
          tabBarItemStyle: { display: 'flex' },
        }}
      />

      {/* 選考状況 */}
      <Tabs.Screen
        name="selection/index"
        options={{
          href: '/ipo/selection',
          title: '選考状況',
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />

      {/* 対策 */}
      <Tabs.Screen
        name="case/index"
        options={{
          href: '/ipo/case',
          title: '対策',
          tabBarIcon: ({ color }) => <Feather name="target" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />

      {/* 調べる */}
      <Tabs.Screen
        name="library/index"
        options={{
          href: '/ipo/library',
          title: '調べる',
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />

      {/* 診断 */}
      <Tabs.Screen
        name="diagnosis/index"
        options={{
          href: '/ipo/diagnosis',
          title: '診断',
          tabBarIcon: ({ color }) => <Feather name="activity" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />
      {/* カレンダー */}
      <Tabs.Screen
        name="calendar/index"
        options={{
          href: '/ipo/calendar',
          title: '予定',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} />,
          tabBarItemStyle: { display: 'flex' },
        }}
      />      
    </Tabs>
  );
}