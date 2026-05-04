import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Avatar } from './Avatar';
import { useAuth } from '@/context/AuthContext';
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Compact avatar button rendered in the dashboard header. Tapping it
 * pushes the dedicated ProfileScreen onto the stack — no bottom sheet
 * anymore, the profile is a real page.
 */
export function ProfileMenu() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();

  return (
    <Pressable
      onPress={() => navigation.navigate('Profile')}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      hitSlop={6}
    >
      <Avatar
        name={profile?.displayName ?? '?'}
        photoUri={profile?.photoUrl ?? undefined}
        size={32}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.7 },
});
