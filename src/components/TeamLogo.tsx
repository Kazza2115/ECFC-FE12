import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ClubLogo } from './ClubLogo';

type Props = {
  teamId?: string | null;
  logoUrl?: string | null;
  size?: number;
};

const CAROUGE_TEAM_ID = 'ecfc-juniors';

/**
 * Renders the right crest for whichever team is in front of the user:
 * - If the team has uploaded a logo, show that.
 * - Else if the team is the legacy Carouge team, show the bundled
 *   Étoile Carouge FC crest.
 * - Else render nothing — the layout caller decides whether to show a
 *   placeholder.
 */
export function TeamLogo({ teamId, logoUrl, size = 40 }: Props) {
  if (logoUrl) {
    return (
      <View
        style={[
          styles.frame,
          { width: size, height: size, borderRadius: size * 0.22 },
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }
  if (teamId === CAROUGE_TEAM_ID) {
    return <ClubLogo size={size} />;
  }
  return null;
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
