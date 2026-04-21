import React from 'react';
import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { MatchLiveScreen } from '@/screens/MatchLiveScreen';
import { SessionScreen } from '@/screens/SessionScreen';
import { SessionsListScreen } from '@/screens/SessionsListScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';
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
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} glyph="⌂" label="Accueil" />
          ),
        }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} glyph="👥" label="Joueurs" />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} glyph="📊" label="Stats" />
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
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { ...typography.h3 },
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
    </Stack.Navigator>
  );
}
