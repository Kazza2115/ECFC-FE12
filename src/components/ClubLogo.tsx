import React from 'react';
import { Image, StyleSheet } from 'react-native';

type Props = { size?: number };

const LOGO = require('../../assets/logo.png');

export function ClubLogo({ size = 48 }: Props) {
  return (
    <Image
      source={LOGO}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: 'transparent',
  },
});
