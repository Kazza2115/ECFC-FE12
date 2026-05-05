import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from './Card';
import { GradientBackdrop } from './GradientBackdrop';
import { Skeleton } from './Skeleton';
import { colors, radius, spacing } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

/**
 * Layout-matching skeleton shown while the DataContext hydrates.
 * Mirrors the shape of the real Dashboard so the swap to live data
 * feels seamless instead of "spinner → boom UI". Uses the same
 * tokens / gradients as the real screen.
 */
export function DashboardSkeleton() {
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View pointerEvents="none" style={styles.topHalo}>
        <GradientBackdrop
          from={colors.primarySoft}
          to={colors.background}
          opacity={1}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header controls + greeting */}
        <View style={styles.header}>
          <View style={styles.controlsRow}>
            <Skeleton width={92} height={28} borderRadius={14} />
            <Skeleton width={36} height={36} borderRadius={18} delay={120} />
            <Skeleton width={36} height={36} borderRadius={18} delay={240} />
          </View>
          <View style={styles.heroRow}>
            <Skeleton width={52} height={52} borderRadius={14} />
            <View style={styles.heroText}>
              <Skeleton width={120} height={11} delay={120} />
              <View style={{ height: 8 }} />
              <Skeleton width={170} height={28} borderRadius={8} delay={200} />
            </View>
          </View>
        </View>

        {/* Hero card */}
        <Card style={styles.heroCard}>
          <GradientBackdrop
            from={colors.primarySoft}
            to={colors.surface}
            radius={radius.lg}
            opacity={1}
          />
          <View style={styles.heroCardRow}>
            <Skeleton width={104} height={104} borderRadius={52} />
            <View style={{ flex: 1, gap: 10 }}>
              <Skeleton width="70%" height={18} delay={80} />
              <Skeleton width="90%" height={12} delay={160} />
              <Skeleton width="55%" height={11} delay={240} />
            </View>
          </View>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Skeleton width="60%" height={11} />
            <View style={{ height: 10 }} />
            <Skeleton width={56} height={28} delay={120} />
          </Card>
          <View style={{ width: spacing.md }} />
          <Card style={styles.statCard}>
            <Skeleton width="60%" height={11} delay={60} />
            <View style={{ height: 10 }} />
            <Skeleton width={56} height={28} delay={180} />
          </Card>
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <Skeleton height={48} borderRadius={radius.lg} />
          <View style={{ height: spacing.sm }} />
          <View style={styles.actionsTwo}>
            <Skeleton height={44} borderRadius={radius.lg} delay={80} />
            <View style={{ width: spacing.sm }} />
            <Skeleton height={44} borderRadius={radius.lg} delay={160} />
          </View>
        </View>

        {/* List */}
        <Card padded={false} style={styles.listCard}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.listRow, i < 2 && styles.listDivider]}>
              <Skeleton width={36} height={36} borderRadius={18} delay={i * 80} />
              <View style={{ flex: 1, marginLeft: spacing.md, gap: 8 }}>
                <Skeleton width="60%" height={14} delay={i * 80 + 60} />
                <Skeleton width="100%" height={6} borderRadius={3} delay={i * 80 + 140} />
              </View>
              <Skeleton width={48} height={14} delay={i * 80 + 200} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    topHalo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 280,
      overflow: 'hidden',
    },
    content: { paddingBottom: spacing.xxl, gap: spacing.md },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    heroText: {
      alignItems: 'flex-start',
    },
    heroCard: {
      marginHorizontal: spacing.lg,
      overflow: 'hidden',
    },
    heroCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
    },
    statCard: {
      flex: 1,
      minHeight: 110,
    },
    actionsRow: {
      paddingHorizontal: spacing.lg,
    },
    actionsTwo: {
      flexDirection: 'row',
    },
    listCard: {
      marginHorizontal: spacing.lg,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    listDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
  });
