import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthScreen } from '@/screens/AuthScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { setActiveTeamId } from '@/storage/supabase';
import { colors } from '@/theme';

function MainShell() {
  const { loading: dataLoading } = useData();
  const { effective, version } = useTheme();

  const navTheme = {
    ...(effective === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(effective === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (dataLoading) {
    return (
      <>
        <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <NavigationContainer key={version} theme={navTheme}>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

// Loading splash with a "Force sign-out" escape hatch. If the user is
// stuck (e.g. corrupted session, unreachable Supabase) the link appears
// after a few seconds and lets them break out.
function Loading({ message }: { message?: string }) {
  const { signOut } = useAuth();
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      {message ? (
        <Text style={[styles.loadingHint, { color: colors.textMuted }]}>
          {message}
        </Text>
      ) : null}
      {showEscape ? (
        <Pressable
          onPress={() => {
            signOut().catch(() => {});
          }}
          style={styles.escape}
        >
          <Text style={[styles.escapeLabel, { color: colors.primary }]}>
            Ça bloque ? Forcer la déconnexion
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuthGate() {
  const { loading, session, profile } = useAuth();
  const { effective } = useTheme();

  if (loading) {
    return (
      <>
        <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
        <Loading />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
        <AuthScreen />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
        <OnboardingScreen />
      </>
    );
  }

  // Apply the team_id synchronously *before* DataProvider mounts so
  // its first remote.fetchAll() reads the right tenant. The
  // AuthContext effect would set it too but only after children's
  // effects fire, which is too late for the initial fetch.
  setActiveTeamId(profile.teamId);

  // Re-key DataProvider on the active team_id so switching account or
  // claiming a fresh team starts the data layer from a clean state.
  return (
    <DataProvider key={profile.teamId}>
      <MainShell />
    </DataProvider>
  );
}

export default function App() {
  // Preload @expo/vector-icons fonts so Feather glyphs render the
  // first time they appear (otherwise web shows empty boxes until the
  // font streams in).
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Font.loadAsync(Feather.font)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {fontsReady ? <AuthGate /> : <Loading />}
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  escape: { marginTop: 12, padding: 12 },
  escapeLabel: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
