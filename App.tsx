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
import { Feather } from '@expo/vector-icons';
import { FEATHER_FONT_DATA_URI } from '@/assets/featherFontBase64';

// On web, react-native-web emits a noisy "useNativeDriver is not
// supported" warning every time an Animated.spring / Animated.timing
// runs with the native driver. The fallback to JS-based animation is
// fine — we just suppress the warning so the console stays usable.
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const first = args[0];
    if (typeof first === 'string' && first.includes('useNativeDriver')) {
      return;
    }
    originalWarn(...args);
  };
}

// On iOS PWA in standalone mode the on-screen keyboard slides up
// without firing a window.resize, so any RN <KeyboardAvoidingView>
// stays put and the keyboard can cover the input the user just
// tapped. We listen for focusin on the document and, once the
// keyboard has had a moment to appear, scroll the focused input
// into the centre of the visual viewport — which works inside a
// scrollable parent (our ScrollView / FlatList) without breaking
// the rest of the app.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const handler = (event: Event) => {
    const el = event.target as HTMLElement | null;
    if (!el) return;
    const tag = (el.tagName || '').toLowerCase();
    if (tag !== 'input' && tag !== 'textarea') return;
    window.setTimeout(() => {
      try {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {
        el.scrollIntoView();
      }
    }, 280);
  };
  document.addEventListener('focusin', handler, true);
}
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

// Make the browser know about Feather by registering a `@font-face`
// rule whose `src` is the TTF embedded as a base64 data URI inside
// the JS bundle. No network request, no path / CORS / GH-Pages 403
// to fight with. The data URI is ~75 KB inside the JS chunk, fully
// cached after the first load.
async function ensureFeatherFontWeb(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if ((globalThis as any).__ecfcFeatherFontReady) return;

  const src = `url('${FEATHER_FONT_DATA_URI}') format('truetype')`;

  if (!document.getElementById('__ecfc_feather_font__')) {
    const styleEl = document.createElement('style');
    styleEl.id = '__ecfc_feather_font__';
    styleEl.textContent =
      `@font-face { font-family: 'Feather'; src: ${src}; ` +
      `font-display: block; }`;
    document.head.appendChild(styleEl);
  }

  const FF = (globalThis as any).FontFace;
  const fonts = (document as any).fonts;
  if (FF && fonts && typeof fonts.add === 'function') {
    try {
      const face = new FF('Feather', src);
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
    // On web we install the Feather font ourselves (base64 data URI).
    // Calling expo-font's Font.loadAsync(Feather.font) there would
    // trigger an extra fetch to a node_modules path that GitHub Pages
    // already 403s — useless noise in the console. Native still needs
    // the regular path so the bundled .ttf is registered.
    const tasks: Promise<unknown>[] = [];
    if (Platform.OS !== 'web') {
      tasks.push(Font.loadAsync(Feather.font));
    } else {
      tasks.push(ensureFeatherFontWeb());
    }
    Promise.allSettled(tasks).finally(() => {
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
