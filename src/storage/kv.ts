import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function hasLocalStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    );
  } catch {
    return false;
  }
}

async function webGet(key: string): Promise<string | null> {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function webSet(key: string, value: string): Promise<void> {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[kv] localStorage.setItem failed', key, err);
    }
    throw err;
  }
}

async function webRemove(key: string): Promise<void> {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export const kv = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webGet(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webSet(key, value);
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return webRemove(key);
    return AsyncStorage.removeItem(key);
  },
  async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web') {
      for (const k of keys) await webRemove(k);
      return;
    }
    await AsyncStorage.multiRemove(keys);
  },
};
