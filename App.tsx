import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthScreen } from '@/screens/AuthScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
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
    return <Loading />;
  }

  return (
    <NavigationContainer key={version} theme={navTheme}>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

function Loading() {
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
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

  // Re-key DataProvider on the active team_id so switching account or
  // claiming a fresh team starts the data layer from a clean state.
  return (
    <DataProvider key={profile.teamId}>
      <MainShell />
    </DataProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
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
  },
});
