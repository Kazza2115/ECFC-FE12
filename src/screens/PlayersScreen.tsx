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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import { confirm } from '@/utils/confirm';
import { pickPlayerPhoto } from '@/utils/photo';

export function PlayersScreen() {
  const {
    players,
    addPlayer,
    removePlayer,
    renamePlayer,
    setPlayerPhoto,
  } = useData();
  const styles = useThemedStyles(makeStyles);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handlePhoto = async (id: string, hasPhoto: boolean) => {
    if (hasPhoto) {
      const ok = await confirm({
        title: 'Photo du joueur',
        message: 'Remplacer ou supprimer la photo actuelle ?',
        confirmLabel: 'Remplacer',
      });
      if (!ok) {
        const del = await confirm({
          title: 'Supprimer la photo ?',
          confirmLabel: 'Supprimer',
          destructive: true,
        });
        if (del) await setPlayerPhoto(id, undefined);
        return;
      }
    }
    setBusyId(id);
    try {
      const uri = await pickPlayerPhoto();
      if (uri) await setPlayerPhoto(id, uri);
    } finally {
      setBusyId(null);
    }
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
              <Pressable
                onPress={() => handlePhoto(item.id, !!item.photoUri)}
                style={styles.avatarWrap}
              >
                <Avatar name={item.name} photoUri={item.photoUri} size={48} />
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraGlyph}>
                    {busyId === item.id ? '…' : '📷'}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.rowText}
                onPress={() => openEdit(item.id, item.name)}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowHint}>
                  {item.photoUri
                    ? 'Photo ajoutée · appuyer pour renommer'
                    : 'Appuyer pour renommer'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item.id, item.name)}
              >
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
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setModalOpen(false)}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={editingId ? 'Enregistrer' : 'Ajouter'}
                onPress={submit}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnLabel: {
    color: c.onPrimary,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 22,
  },
  emptyWrap: { padding: spacing.lg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraGlyph: { fontSize: 12 },
  rowText: { flex: 1 },
  rowName: {
    ...typography.bodyBold,
    color: c.textPrimary,
    fontSize: 16,
  },
  rowHint: { ...typography.caption, color: c.textMuted, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: c.dangerSoft,
  },
  deleteBtnLabel: { color: c.danger, fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420 },
  modalTitle: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: c.textPrimary,
    backgroundColor: c.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
});
