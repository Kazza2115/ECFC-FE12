import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
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

// jsDelivr-hosted Feather TTF used as a CDN fallback in case the
// bundled-asset URL resolution misbehaves on a particular deployment
// (the GitHub Pages baseUrl / expo-asset combination has been
// inconsistent on web).
const FEATHER_CDN_URL =
  'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Feather.ttf';

async function resolveBundledFeatherUrl(): Promise<string | null> {
  try {
    const featherTtf = require(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf',
    );
    const asset = Asset.fromModule(featherTtf);
    await asset.downloadAsync();
    return asset.localUri || asset.uri || null;
  } catch {
    return null;
  }
}

// Make sure the browser knows about Feather by (1) injecting a CSS
// @font-face rule with both bundled and CDN URLs (the browser will
// gracefully fall back to the CDN if the bundled URL 404s), and
// (2) explicitly loading via the FontFace API so document.fonts is
// populated before icons render.
async function ensureFeatherFontWeb(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if ((globalThis as any).__ecfcFeatherFontReady) return;

  const bundledUrl = await resolveBundledFeatherUrl();
  const sources = [bundledUrl, FEATHER_CDN_URL]
    .filter((u): u is string => !!u)
    .map((u) => `url('${u}') format('truetype')`)
    .join(', ');

  if (!sources) return;

  if (!document.getElementById('__ecfc_feather_font__')) {
    const styleEl = document.createElement('style');
    styleEl.id = '__ecfc_feather_font__';
    styleEl.textContent =
      `@font-face { font-family: 'Feather'; src: ${sources}; ` +
      `font-display: block; }`;
    document.head.appendChild(styleEl);
  }

  const FF = (globalThis as any).FontFace;
  const fonts = (document as any).fonts;
  if (FF && fonts && typeof fonts.add === 'function') {
    try {
      const face = new FF('Feather', sources);
      await face.load();
      fonts.add(face);
    } catch {
      // fall through — at least the @font-face rule is installed.
    }
  }

  (globalThis as any).__ecfcFeatherFontReady = true;
}

export default function App() {
  // Preload @expo/vector-icons fonts so Feather glyphs render the
  // first time they appear (otherwise web shows empty boxes until the
  // font streams in). On web we *also* inject the @font-face CSS rule
  // directly because expo-font has been silently failing on GitHub
  // Pages — having both gives us a reliable fallback.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      Font.loadAsync(Feather.font),
      ensureFeatherFontWeb(),
    ]).finally(() => {
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
