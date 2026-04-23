import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Avatar } from './Avatar';
import { POSITION_META } from '@/constants/positions';
import { colors, radius, typography } from '@/theme';
import type { Formation, FormationSlot } from '@/constants/formations';
import type { Player } from '@/types';

const PITCH_ASPECT = 0.66; // 2:3 roughly — portrait pitch

type Props = {
  formation: Formation;
  lineupSlots: Record<string, string>;
  players: Player[];
  onSlotPress: (slot: FormationSlot) => void;
  readOnly?: boolean;
};

export function FormationPitch({
  formation,
  lineupSlots,
  players,
  onSlotPress,
  readOnly,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.pitchWrap]} onLayout={onLayout}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
        >
          {/* Grass */}
          <Rect x={0} y={0} width={100} height={150} fill="#1F7A36" />
          {/* Stripes */}
          {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135].map((y) => (
            <Rect
              key={y}
              x={0}
              y={y}
              width={100}
              height={15}
              fill={
                (y / 15) % 2 === 0
                  ? 'rgba(255,255,255,0.035)'
                  : 'rgba(0,0,0,0.035)'
              }
            />
          ))}
          {/* Outer border */}
          <Rect
            x={3}
            y={3}
            width={94}
            height={144}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
          {/* Halfway line */}
          <Line
            x1={3}
            y1={75}
            x2={97}
            y2={75}
            stroke="white"
            strokeWidth={0.5}
          />
          {/* Center circle */}
          <Circle
            cx={50}
            cy={75}
            r={11}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
          <Circle cx={50} cy={75} r={0.8} fill="white" />
          {/* Top penalty box (opponent) */}
          <Rect
            x={24}
            y={3}
            width={52}
            height={18}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
          <Rect
            x={36}
            y={3}
            width={28}
            height={7}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
          {/* Bottom penalty box (ours) */}
          <Rect
            x={24}
            y={129}
            width={52}
            height={18}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
          <Rect
            x={36}
            y={140}
            width={28}
            height={7}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
        </Svg>

        {size.width > 0
          ? formation.slots.map((slot) => {
              const playerId = lineupSlots[slot.id];
              const player = playerId
                ? players.find((p) => p.id === playerId)
                : undefined;
              const cx = (slot.x / 100) * size.width;
              const cy = (slot.y / 100) * size.height;
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => !readOnly && onSlotPress(slot)}
                  disabled={readOnly}
                  style={[
                    styles.slot,
                    {
                      left: cx - SLOT_SIZE / 2,
                      top: cy - SLOT_SIZE / 2,
                    },
                  ]}
                >
                  {player ? (
                    <>
                      <View
                        style={[
                          styles.slotAvatarWrap,
                          {
                            borderColor: POSITION_META[slot.position].color,
                          },
                        ]}
                      >
                        <Avatar
                          name={player.name}
                          photoUri={player.photoUri}
                          size={SLOT_SIZE - 10}
                        />
                      </View>
                      <Text
                        style={styles.slotPlayerName}
                        numberOfLines={1}
                      >
                        {lastName(player.name)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.slotEmpty,
                          {
                            borderColor:
                              POSITION_META[slot.position].color + 'cc',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotEmptyPlus,
                            {
                              color:
                                POSITION_META[slot.position].color,
                            },
                          ]}
                        >
                          +
                        </Text>
                      </View>
                      <Text style={styles.slotPlaceholder}>
                        {slot.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })
          : null}
      </View>
    </View>
  );
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}

const SLOT_SIZE = 46;

const styles = StyleSheet.create({
  outer: {
    width: '100%',
  },
  pitchWrap: {
    width: '100%',
    aspectRatio: PITCH_ASPECT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1F7A36',
  },
  slot: {
    position: 'absolute',
    width: SLOT_SIZE,
    alignItems: 'center',
  },
  slotAvatarWrap: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotEmpty: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyPlus: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },
  slotPlayerName: {
    ...typography.caption,
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: SLOT_SIZE + 24,
  },
  slotPlaceholder: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
