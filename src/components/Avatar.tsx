import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';

const PALETTE = [
  '#D7141A',
  '#1E3A8A',
  '#B45309',
  '#6D28D9',
  '#0E7490',
  '#BE185D',
  '#047857',
  '#B91C1C',
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  name: string;
  photoUri?: string;
  size?: number;
};

export function Avatar({ name, photoUri, size = 40 }: Props) {
  const color = PALETTE[hashString(name) % PALETTE.length];
  const styleBase = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={[styles.image, styleBase]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.circle, styleBase, { backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: '#E5E7EB',
  },
  text: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
