import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, type ColorSchemeName } from 'react-native';
import { kv } from '@/storage/kv';
import { applyPalette, type ThemeMode } from '@/theme';

export type ThemePreference = 'auto' | 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  effective: ThemeMode;
  version: number;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = '@ecfc/theme-mode';

function readSystem(): ThemeMode {
  const scheme: ColorSchemeName = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): ThemeMode {
  return pref === 'auto' ? readSystem() : pref;
}

// Synchronous boot for web — read the persisted preference before
// React mounts so the very first render uses the right palette and
// no flicker is visible.
function readInitialSync(): ThemePreference {
  if (Platform.OS !== 'web') return 'auto';
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'auto';
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  } catch {}
  return 'auto';
}

const initialPreference = readInitialSync();
applyPalette(resolve(initialPreference));

const ThemeContext = createContext<ThemeContextValue>({
  preference: initialPreference,
  effective: resolve(initialPreference),
  version: 0,
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(initialPreference);
  const [systemScheme, setSystemScheme] = useState<ThemeMode>(readSystem());
  const [version, setVersion] = useState<number>(0);

  // Async hydration on native (AsyncStorage). Web is already hydrated.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await kv.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw === 'light' || raw === 'dark' || raw === 'auto') {
          if (raw !== preference) {
            setPref(raw);
            applyPalette(resolve(raw));
            setVersion((v) => v + 1);
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to system theme changes (only meaningful when preference is 'auto').
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const next: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
      setSystemScheme(next);
    });
    return () => sub.remove();
  }, []);

  // When preference is 'auto' and the system scheme changed, re-apply.
  useEffect(() => {
    if (preference !== 'auto') return;
    applyPalette(systemScheme);
    setVersion((v) => v + 1);
  }, [preference, systemScheme]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPref(next);
    applyPalette(resolve(next));
    setVersion((v) => v + 1);
    try {
      await kv.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const effective = resolve(preference);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, effective, version, setPreference }),
    [preference, effective, version, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
