import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirm } from '@/utils/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';

export function PlayersScreen() {
  const { players, addPlayer, removePlayer, renamePlayer } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setModalOpen(true);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingId) {
      await renamePlayer(editingId, trimmed);
    } else {
      await addPlayer(trimmed);
    }
    setModalOpen(false);
    setName('');
    setEditingId(null);
  };

  const confirmDelete = async (id: string, playerName: string) => {
    const ok = await confirm({
      title: `Supprimer ${playerName} ?`,
      message: 'Toutes les présences associées seront effacées.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    await removePlayer(id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Joueurs"
        subtitle={`${players.length} dans l'effectif`}
        right={
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnLabel}>＋</Text>
          </Pressable>
        }
      />

      {players.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Card>
            <EmptyState
              title="Aucun joueur"
              description="Ajoutez vos joueurs pour commencer."
            >
              <Button label="Ajouter un joueur" onPress={openCreate} fullWidth />
            </EmptyState>
          </Card>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Card padded={false} style={styles.row}>
              <Avatar name={item.name} size={40} />
              <Pressable style={styles.rowText} onPress={() => openEdit(item.id, item.name)}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowHint}>Appuyer pour renommer</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(item.id, item.name)}>
                <Text style={styles.deleteBtnLabel}>Suppr.</Text>
              </Pressable>
            </Card>
          )}
        />
      )}

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Renommer le joueur' : 'Nouveau joueur'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom Nom"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <View style={styles.modalActions}>
              <Button label="Annuler" variant="secondary" onPress={() => setModalOpen(false)} />
              <View style={{ width: spacing.sm }} />
              <Button label={editingId ? 'Enregistrer' : 'Ajouter'} onPress={submit} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 22, lineHeight: 24 },
  emptyWrap: { padding: spacing.lg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 },
  rowHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#FEE2E2',
  },
  deleteBtnLabel: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420 },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
});
