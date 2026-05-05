import React from 'react';
import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { MatchLiveScreen } from '@/screens/MatchLiveScreen';
import { MatchSheetScreen } from '@/screens/MatchSheetScreen';
import { SessionScreen } from '@/screens/SessionScreen';
import { SessionsListScreen } from '@/screens/SessionsListScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';
import { PlayerDetailScreen } from '@/screens/PlayerDetailScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { TabIcon } from '@/components/TabIcon';
import { colors, typography } from '@/theme';

export type TabParamList = {
  Dashboard: undefined;
  Players: undefined;
  Stats: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Session: { sessionId: string };
  Sessions: undefined;
  MatchLive: { sessionId: string };
  MatchSheet: { sessionId: string };
  PlayerDetail: { playerId: string };
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  // Add the device's bottom safe-area inset on top of the visual tab
  // bar height so the icons clear the iOS home indicator on phones,
  // and don't waste space on iPads / browsers without one.
  const insets = useSafeAreaInsets();
  const VISIBLE_HEIGHT = 60;
  const TOP_PADDING = 10;
  const BOTTOM_PADDING = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: VISIBLE_HEIGHT + TOP_PADDING + BOTTOM_PADDING,
          paddingTop: TOP_PADDING,
          paddingBottom: BOTTOM_PADDING,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" label="Accueil" />
          ),
        }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="users" label="Joueurs" />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="bar-chart-2" label="Stats" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Soft cross-fade between screens — feels closer to a HeroUI
        // web app than the default iOS horizontal slide. Pairs nicely
        // with the per-section AnimatedFadeIn on every page.
        animation: 'fade',
        animationDuration: 220,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { ...typography.h3, color: colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={Tabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Sessions"
        component={SessionsListScreen}
        options={{ title: 'Séances' }}
      />
      <Stack.Screen
        name="Session"
        component={SessionScreen}
        options={{ title: 'Séance' }}
      />
      <Stack.Screen
        name="MatchLive"
        component={MatchLiveScreen}
        options={{ title: 'Match Live' }}
      />
      <Stack.Screen
        name="MatchSheet"
        component={MatchSheetScreen}
        options={{ title: 'Feuille de match' }}
      />
      <Stack.Screen
        name="PlayerDetail"
        component={PlayerDetailScreen}
        options={{ title: 'Joueur' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Mon profil' }}
      />
    </Stack.Navigator>
  );
}
