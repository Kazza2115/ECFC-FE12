import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { buildAttendanceCSV } from '@/utils/csv';

export function StatsScreen() {
  const { players, sessions, attendances, playerStats, globalRatio } = useData();

  const best = playerStats[0];
  const worst = playerStats[playerStats.length - 1];

  const exportCSV = async () => {
    try {
      if (sessions.length === 0) {
        Alert.alert('Aucune donnée', 'Créez au moins une séance avant d\'exporter.');
        return;
      }
      const csv = buildAttendanceCSV(players, sessions, attendances);
      const fileUri = `${FileSystem.cacheDirectory}presences-ecfc.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter les présences',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export prêt', `Fichier enregistré : ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Erreur', 'L\'export a échoué.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Statistiques"
        subtitle="Vue complète de l'assiduité"
        right={
          <Pressable style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportLabel}>Export CSV</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sessions.length === 0 || players.length === 0 ? (
          <Card>
            <EmptyState
              title="Pas encore de données"
              description="Créez des joueurs et lancez une séance pour faire apparaître les stats."
            />
          </Card>
        ) : (
          <>
            <Card style={styles.hero}>
              <View style={styles.heroRow}>
                <ProgressRing value={globalRatio} size={130} strokeWidth={12} label="global" />
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>Assiduité globale</Text>
                  <Text style={styles.heroHint}>
                    {players.length} joueurs · {sessions.length} séances
                  </Text>
                  {best ? (
                    <View style={styles.heroMetaRow}>
                      <Text style={styles.heroMetaLabel}>Meilleur</Text>
                      <Text style={styles.heroMetaValue}>
                        {best.player.name} · {Math.round(best.ratio * 100)}%
                      </Text>
                    </View>
                  ) : null}
                  {worst && worst !== best ? (
                    <View style={styles.heroMetaRow}>
                      <Text style={styles.heroMetaLabel}>À encourager</Text>
                      <Text style={styles.heroMetaValue}>
                        {worst.player.name} · {Math.round(worst.ratio * 100)}%
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>

            <View style={styles.statsRow}>
              <StatCard
                label="Séances"
                value={sessions.length}
                hint="enregistrées"
                accent={colors.primary}
              />
              <View style={{ width: spacing.md }} />
              <StatCard
                label="Présences"
                value={attendances.filter((a) => a.status === 'present').length}
                hint="cumulées"
                accent={colors.success}
              />
            </View>

            <Text style={styles.sectionTitle}>Par joueur</Text>

            <Card padded={false} style={styles.listCard}>
              {playerStats.map((stat, index) => (
                <View
                  key={stat.player.id}
                  style={[
                    styles.playerRow,
                    index < playerStats.length - 1 && styles.rowDivider,
                  ]}
                >
                  <Avatar name={stat.player.name} size={40} />
                  <View style={styles.playerInfo}>
                    <View style={styles.playerTop}>
                      <Text style={styles.playerName}>{stat.player.name}</Text>
                      <Text style={styles.playerPct}>{Math.round(stat.ratio * 100)}%</Text>
                    </View>
                    <View style={styles.barWrap}>
                      <ProgressBar value={stat.ratio} height={6} />
                    </View>
                    <Text style={styles.playerMeta}>
                      {stat.present} / {stat.total} séance{stat.total > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  exportBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  exportLabel: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  hero: {},
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1 },
  heroTitle: { ...typography.h3, color: colors.textPrimary },
  heroHint: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  heroMetaRow: { marginTop: 8 },
  heroMetaLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  heroMetaValue: { ...typography.bodyBold, color: colors.textPrimary, marginTop: 2 },
  statsRow: { flexDirection: 'row' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md },
  listCard: {},
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  playerInfo: { flex: 1 },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 15 },
  playerPct: { ...typography.bodyBold, color: colors.primary },
  barWrap: { marginTop: 6 },
  playerMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
