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

  // Common options: keep tabs/screens alive, but **hide only the visible tab bar**
  const common: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: '#3B82F6',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarButton: () => null, // hide individual tab buttons (no footer buttons)
    tabBarStyle: Platform.select({
      ios: { height: 0, backgroundColor: 'transparent', borderTopWidth: 0 },
      default: { height: 0, backgroundColor: 'transparent', borderTopWidth: 0 },
    }),
    tabBarLabelStyle: { display: 'none' },
    tabBarItemStyle: { display: 'none' },
    lazy: true,
  };

  // Render Tabs so child routes remain active & navigable via links/href, but the footer itself is hidden
  return (
    <Tabs screenOptions={common}>
      {/* ホーム */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: '/ipo/dashboard',
          title: 'ホーム',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* 自己分析 */}
      <Tabs.Screen
        name="analysis/index"
        options={{
          href: '/ipo/analysis',
          title: '自己分析',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="brain" size={24} color={color} />
          ),
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* 選考状況 */}
      <Tabs.Screen
        name="selection/index"
        options={{
          href: '/ipo/selection',
          title: '選考管理',
          tabBarIcon: ({ color }) => <Feather name="clipboard" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* 対策 */}
      {/*
      <Tabs.Screen
        name="case/index"
        options={{
          href: '/ipo/case',
          title: '選考対策',
          tabBarIcon: ({ color }) => <Feather name="target" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      */}

      {/* 調べる */}
      <Tabs.Screen
        name="library/index"
        options={{
          href: '/ipo/library',
          title: '調べる',
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* 診断 */}
      <Tabs.Screen
        name="diagnosis/index"
        options={{
          href: '/ipo/diagnosis',
          title: '診断',
          tabBarIcon: ({ color }) => <Feather name="activity" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* ES管理 */}
      <Tabs.Screen
        name="ES/index"
        options={{
          href: '/ipo/ES',
          title: 'ES管理',
          tabBarIcon: ({ color }) => <Feather name="edit-3" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* カレンダー */}
      <Tabs.Screen
        name="calendar/index"
        options={{
          href: '/ipo/calendar',
          title: '予定',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      {/* プロフィール */}
      <Tabs.Screen
        name="profile"
        options={{
          href: '/profile',
          title: 'プロフィール',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}