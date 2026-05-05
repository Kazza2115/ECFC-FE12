import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AnimatedFadeIn } from '@/components/AnimatedFadeIn';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { TeamLogo } from '@/components/TeamLogo';
import { useAuth } from '@/context/AuthContext';
import { auth, type CoachNote } from '@/storage/remote';
import { confirm } from '@/utils/confirm';
import { pickPlayerPhoto } from '@/utils/photo';
import { formatDate } from '@/utils/date';
import { colors, radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const {
    profile,
    session,
    updateProfile,
    setCoachPhoto,
    setTeamLogo,
    switchTeam,
    joinTeamByCode,
    joinTeamByName,
    signOut,
  } = useAuth();
  const styles = useThemedStyles(makeStyles);

  // Identity edit state
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Team-logo edit state
  const [logoBusy, setLogoBusy] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Add-team bottom sheet state. `null` = closed, 'pick' = the two-
  // option chooser, 'claim' = code-input form, 'create' = name form.
  const [teamSheet, setTeamSheet] = useState<
    | null
    | { mode: 'pick' }
    | { mode: 'claim' }
    | { mode: 'create' }
  >(null);
  const [teamSheetCode, setTeamSheetCode] = useState('');
  const [teamSheetName, setTeamSheetName] = useState('');
  const [teamSheetBusy, setTeamSheetBusy] = useState(false);
  const [teamSheetError, setTeamSheetError] = useState<string | null>(null);
  // Compact team-switcher (dropdown) state.
  const [teamSwitcherOpen, setTeamSwitcherOpen] = useState(false);
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  // The id of the note currently being edited, or 'new' for an unsaved
  // brand new note.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [noteBusy, setNoteBusy] = useState<string | null>(null);

  const userId = session?.user?.id;

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Mon profil' });
  }, [navigation]);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await auth.fetchNotes(userId);
        if (!cancelled) setNotes(list);
      } catch (err: any) {
        if (!cancelled)
          setNotesError(err?.message ?? 'Impossible de charger les notes.');
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveName = async () => {
    setIdentityError(null);
    const v = displayName.trim();
    if (!v) {
      setIdentityError('Ton nom est requis.');
      return;
    }
    if (v === profile?.displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ displayName: v });
      setEditingName(false);
    } catch (err: any) {
      setIdentityError(err?.message ?? 'Impossible de sauvegarder.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePhoto = async () => {
    setIdentityError(null);
    if (profile?.photoUrl) {
      const replace = await confirm({
        title: 'Photo de profil',
        message: 'Remplacer ou supprimer la photo actuelle ?',
        confirmLabel: 'Remplacer',
      });
      if (!replace) {
        const del = await confirm({
          title: 'Supprimer la photo ?',
          confirmLabel: 'Supprimer',
          destructive: true,
        });
        if (del) {
          setPhotoBusy(true);
          try {
            await setCoachPhoto(undefined);
          } catch (err: any) {
            setIdentityError(err?.message ?? 'Suppression échouée.');
          } finally {
            setPhotoBusy(false);
          }
        }
        return;
      }
    }
    setPhotoBusy(true);
    try {
      const uri = await pickPlayerPhoto();
      if (uri) await setCoachPhoto(uri);
    } catch (err: any) {
      setIdentityError(err?.message ?? 'Téléversement échoué.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleTeamLogo = async () => {
    setTeamError(null);
    if (profile?.teamLogoUrl) {
      const replace = await confirm({
        title: 'Blason de l\'équipe',
        message: 'Remplacer ou supprimer le blason actuel ?',
        confirmLabel: 'Remplacer',
      });
      if (!replace) {
        const del = await confirm({
          title: 'Supprimer le blason ?',
          confirmLabel: 'Supprimer',
          destructive: true,
        });
        if (del) {
          setLogoBusy(true);
          try {
            await setTeamLogo(undefined);
          } catch (err: any) {
            setTeamError(err?.message ?? 'Suppression échouée.');
          } finally {
            setLogoBusy(false);
          }
        }
        return;
      }
    }
    setLogoBusy(true);
    try {
      const uri = await pickPlayerPhoto();
      if (uri) await setTeamLogo(uri);
    } catch (err: any) {
      setTeamError(err?.message ?? 'Téléversement échoué.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: "Tu reviendras sur l'écran de connexion.",
      confirmLabel: 'Se déconnecter',
      destructive: true,
    });
    if (!ok) return;
    await signOut();
  };

  // ----- Notes ------------------------------------------------------

  const startNewNote = () => {
    setNotesError(null);
    setDraft('');
    setEditingNoteId('new');
  };

  const startEditNote = (n: CoachNote) => {
    setNotesError(null);
    setDraft(n.content);
    setEditingNoteId(n.id);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setDraft('');
  };

  const saveNote = async () => {
    if (!userId) return;
    const v = draft.trim();
    if (!v) {
      setNotesError('Une note ne peut pas être vide.');
      return;
    }
    setNoteBusy(editingNoteId);
    setNotesError(null);
    try {
      if (editingNoteId === 'new') {
        const created = await auth.createNote(userId, v);
        setNotes((prev) => [created, ...prev]);
      } else if (editingNoteId) {
        await auth.updateNote(editingNoteId, v);
        const nowIso = new Date().toISOString();
        setNotes((prev) =>
          prev
            .map((n) =>
              n.id === editingNoteId
                ? { ...n, content: v, updatedAt: nowIso }
                : n,
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            ),
        );
      }
      cancelEdit();
    } catch (err: any) {
      setNotesError(err?.message ?? 'Sauvegarde échouée.');
    } finally {
      setNoteBusy(null);
    }
  };

  const deleteNote = async (n: CoachNote) => {
    const ok = await confirm({
      title: 'Supprimer cette note ?',
      message: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    setNoteBusy(n.id);
    setNotesError(null);
    try {
      await auth.deleteNote(n.id);
      setNotes((prev) => prev.filter((x) => x.id !== n.id));
      if (editingNoteId === n.id) cancelEdit();
    } catch (err: any) {
      setNotesError(err?.message ?? 'Suppression échouée.');
    } finally {
      setNoteBusy(null);
    }
  };

  const hasTeamLogo =
    !!profile?.teamLogoUrl || profile?.teamId === 'ecfc-juniors';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Identity ------------------------------------------------- */}
          <AnimatedFadeIn delay={0}>
          <Card style={styles.identityCard}>
            <Pressable
              onPress={photoBusy ? undefined : handlePhoto}
              style={styles.avatarWrap}
            >
              <Avatar
                name={profile?.displayName ?? '?'}
                photoUri={profile?.photoUrl ?? undefined}
                size={104}
              />
              <View style={styles.cameraBadge}>
                {photoBusy ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.cameraGlyph}>📷</Text>
                )}
              </View>
            </Pressable>

            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Prénom Nom"
                  placeholderTextColor="#8E8E93"
                  autoFocus
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={saveName}
                  style={styles.iconBtn}
                  disabled={savingName}
                  hitSlop={8}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Feather name="check" size={18} color={colors.onPrimary} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditingName(false);
                    setDisplayName(profile?.displayName ?? '');
                    setIdentityError(null);
                  }}
                  style={styles.iconBtnGhost}
                  hitSlop={8}
                >
                  <Text style={styles.iconBtnGhostLabel}>×</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setEditingName(true)}
                style={styles.nameRow}
                hitSlop={4}
              >
                <Text style={styles.name}>{profile?.displayName ?? '—'}</Text>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </Pressable>
            )}

            <Text style={styles.email}>{session?.user?.email ?? ''}</Text>

            {identityError ? (
              <Text style={styles.error}>{identityError}</Text>
            ) : null}
          </Card>
          </AnimatedFadeIn>

          {/* Mes équipes -------------------------------------------- */}
          <AnimatedFadeIn delay={80}>
          <View style={styles.section}>
            <View style={styles.teamsHeader}>
              <Text style={styles.sectionTitle}>Mon équipe</Text>
              <Pressable
                onPress={() => setTeamSheet({ mode: 'pick' })}
                style={styles.addBtn}
                hitSlop={6}
              >
                <Feather name="plus" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>

            {(() => {
              const teams = profile?.teams ?? [];
              const activeTeam = teams.find((t) => t.id === profile?.teamId);
              const isCarougeTeam = activeTeam?.id === 'ecfc-juniors';
              const teamHasLogo = !!activeTeam?.logoUrl || isCarougeTeam;
              if (!activeTeam) return null;
              const teamCount = teams.length;
              return (
                <Card style={[styles.teamCard, styles.teamCardActive]}>
                  <View style={styles.teamRow}>
                    <Pressable
                      onPress={!logoBusy ? handleTeamLogo : undefined}
                      style={styles.teamLogoWrap}
                      disabled={logoBusy}
                    >
                      {teamHasLogo ? (
                        <TeamLogo
                          teamId={activeTeam.id}
                          logoUrl={activeTeam.logoUrl}
                          size={48}
                        />
                      ) : (
                        <View style={styles.teamLogoPlaceholder}>
                          <Feather
                            name="plus"
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <View style={styles.teamLogoBadge}>
                        {logoBusy ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Text style={styles.cameraGlyph}>📷</Text>
                        )}
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => setTeamSwitcherOpen(true)}
                      style={({ pressed }) => [
                        styles.teamSelect,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.teamName} numberOfLines={1}>
                          {activeTeam.name}
                        </Text>
                        <Text style={styles.teamHint}>
                          {teamCount > 1
                            ? `Tape pour changer d'équipe (${teamCount})`
                            : 'Tape pour gérer tes équipes'}
                        </Text>
                      </View>
                      <Feather
                        name="chevron-down"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </Card>
              );
            })()}

            {teamError ? (
              <Text style={styles.error}>{teamError}</Text>
            ) : null}
          </View>
          </AnimatedFadeIn>

          {/* Coin notes --------------------------------------------- */}
          <AnimatedFadeIn delay={160}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Coin notes</Text>
              {editingNoteId !== 'new' ? (
                <Pressable
                  onPress={startNewNote}
                  style={styles.addBtn}
                  hitSlop={6}
                >
                  <Feather name="plus" size={18} color={colors.onPrimary} />
                </Pressable>
              ) : null}
            </View>

            {notesError ? (
              <Text style={styles.error}>{notesError}</Text>
            ) : null}

            {/* New-note draft */}
            {editingNoteId === 'new' ? (
              <Card style={styles.noteCard}>
                <TextInput
                  style={[styles.noteInput, styles.noteInputMultiline]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Ta note…"
                  placeholderTextColor="#8E8E93"
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                <View style={styles.noteActions}>
                  <Button
                    label="Annuler"
                    variant="secondary"
                    onPress={cancelEdit}
                  />
                  <View style={{ width: spacing.sm }} />
                  <Button label="Enregistrer" onPress={saveNote} />
                </View>
              </Card>
            ) : null}

            {notesLoading ? (
              <View style={{ gap: spacing.sm }}>
                {[0, 1, 2].map((i) => (
                  <Card key={i} style={styles.noteCard}>
                    <Skeleton width="90%" height={14} delay={i * 90} />
                    <View style={{ height: 8 }} />
                    <Skeleton width="60%" height={14} delay={i * 90 + 60} />
                    <View style={{ height: 12 }} />
                    <Skeleton width={80} height={11} delay={i * 90 + 120} />
                  </Card>
                ))}
              </View>
            ) : notes.length === 0 && editingNoteId !== 'new' ? (
              <Card>
                <EmptyState
                  art="notes"
                  title="Aucune note"
                  description="Garde tes idées d'entraînement, retours match, choses à retenir : tape sur ＋ pour en ajouter une."
                />
              </Card>
            ) : (
              notes.map((n) => {
                const isEditing = editingNoteId === n.id;
                const busy = noteBusy === n.id;
                return (
                  <Card key={n.id} style={styles.noteCard}>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={[styles.noteInput, styles.noteInputMultiline]}
                          value={draft}
                          onChangeText={setDraft}
                          placeholder="Ta note…"
                          placeholderTextColor="#8E8E93"
                          multiline
                          textAlignVertical="top"
                          autoFocus
                        />
                        <View style={styles.noteActions}>
                          <Button
                            label="Annuler"
                            variant="secondary"
                            onPress={cancelEdit}
                          />
                          <View style={{ width: spacing.sm }} />
                          <Button label="Enregistrer" onPress={saveNote} />
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.noteContent}>{n.content}</Text>
                        <View style={styles.noteFooter}>
                          <Text style={styles.noteMeta}>
                            {formatDate(n.updatedAt)}
                          </Text>
                          <View style={styles.noteToolbar}>
                            <Pressable
                              onPress={() => startEditNote(n)}
                              style={styles.noteIconBtn}
                              disabled={busy}
                              hitSlop={6}
                            >
                              <Feather name="edit-2" size={14} color={colors.primary} />
                            </Pressable>
                            <Pressable
                              onPress={() => deleteNote(n)}
                              style={styles.noteIconDelete}
                              disabled={busy}
                              hitSlop={6}
                            >
                              {busy ? (
                                <ActivityIndicator size="small" />
                              ) : (
                                <Feather name="trash-2" size={14} color={colors.danger} />
                              )}
                            </Pressable>
                          </View>
                        </View>
                      </>
                    )}
                  </Card>
                );
              })
            )}
          </View>
          </AnimatedFadeIn>

          <AnimatedFadeIn delay={240}>
          <View style={styles.section}>
            <Button
              label="Se déconnecter"
              variant="secondary"
              onPress={handleSignOut}
              fullWidth
            />
          </View>
          </AnimatedFadeIn>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={!!teamSheet}
        title={
          teamSheet?.mode === 'claim'
            ? "Rejoindre une équipe"
            : teamSheet?.mode === 'create'
            ? "Créer une équipe"
            : 'Ajouter une équipe'
        }
        onClose={() => {
          setTeamSheet(null);
          setTeamSheetCode('');
          setTeamSheetName('');
          setTeamSheetError(null);
        }}
      >
        {teamSheet?.mode === 'pick' ? (
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={() => {
                setTeamSheetError(null);
                setTeamSheet({ mode: 'claim' });
              }}
              style={styles.teamChoice}
            >
              <Feather name="key" size={20} color={colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.teamChoiceTitle}>J'ai un code d'équipe</Text>
                <Text style={styles.teamChoiceHint}>
                  Pour rejoindre une équipe déjà existante.
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                setTeamSheetError(null);
                setTeamSheet({ mode: 'create' });
              }}
              style={styles.teamChoice}
            >
              <Feather name="plus" size={20} color={colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.teamChoiceTitle}>Créer une équipe</Text>
                <Text style={styles.teamChoiceHint}>
                  Une nouvelle équipe vide, à toi de la peupler.
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {teamSheet?.mode === 'claim' ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Code d'équipe</Text>
            <TextInput
              style={styles.input}
              placeholder="ABCD-1234"
              placeholderTextColor="#8E8E93"
              autoCapitalize="characters"
              autoCorrect={false}
              value={teamSheetCode}
              onChangeText={setTeamSheetCode}
              editable={!teamSheetBusy}
            />
            {teamSheetError ? (
              <Text style={styles.error}>{teamSheetError}</Text>
            ) : null}
            <View style={{ height: spacing.sm }} />
            <View style={styles.teamSheetActions}>
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setTeamSheet({ mode: 'pick' })}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={teamSheetBusy ? '…' : 'Rejoindre'}
                onPress={async () => {
                  if (teamSheetBusy) return;
                  setTeamSheetError(null);
                  setTeamSheetBusy(true);
                  try {
                    await joinTeamByCode(teamSheetCode);
                    setTeamSheet(null);
                    setTeamSheetCode('');
                  } catch (err: any) {
                    setTeamSheetError(
                      err?.message ?? 'Le rattachement a échoué.',
                    );
                  } finally {
                    setTeamSheetBusy(false);
                  }
                }}
                disabled={teamSheetBusy}
              />
            </View>
          </View>
        ) : null}

        {teamSheet?.mode === 'create' ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Nom de l'équipe</Text>
            <TextInput
              style={styles.input}
              placeholder="Mon équipe FC"
              placeholderTextColor="#8E8E93"
              value={teamSheetName}
              onChangeText={setTeamSheetName}
              editable={!teamSheetBusy}
            />
            {teamSheetError ? (
              <Text style={styles.error}>{teamSheetError}</Text>
            ) : null}
            <View style={{ height: spacing.sm }} />
            <View style={styles.teamSheetActions}>
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setTeamSheet({ mode: 'pick' })}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={teamSheetBusy ? '…' : 'Créer'}
                onPress={async () => {
                  if (teamSheetBusy) return;
                  setTeamSheetError(null);
                  setTeamSheetBusy(true);
                  try {
                    await joinTeamByName(teamSheetName);
                    setTeamSheet(null);
                    setTeamSheetName('');
                  } catch (err: any) {
                    setTeamSheetError(
                      err?.message ?? 'La création a échoué.',
                    );
                  } finally {
                    setTeamSheetBusy(false);
                  }
                }}
                disabled={teamSheetBusy}
              />
            </View>
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={teamSwitcherOpen}
        title="Choisir une équipe"
        onClose={() => setTeamSwitcherOpen(false)}
      >
        <View style={{ gap: spacing.sm }}>
          {(profile?.teams ?? []).map((team) => {
            const isActive = team.id === profile?.teamId;
            const isSwitching = switchingTeamId === team.id;
            return (
              <Pressable
                key={team.id}
                disabled={isSwitching}
                onPress={async () => {
                  if (isActive) {
                    setTeamSwitcherOpen(false);
                    return;
                  }
                  setTeamError(null);
                  setSwitchingTeamId(team.id);
                  try {
                    await switchTeam(team.id);
                    setTeamSwitcherOpen(false);
                  } catch (err: any) {
                    setTeamError(
                      err?.message ?? "Impossible de changer d'équipe.",
                    );
                  } finally {
                    setSwitchingTeamId(null);
                  }
                }}
                style={({ pressed }) => [
                  styles.teamPickRow,
                  isActive && styles.teamPickRowActive,
                  pressed && !isActive && { opacity: 0.85 },
                ]}
              >
                <TeamLogo
                  teamId={team.id}
                  logoUrl={team.logoUrl}
                  size={40}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {team.name}
                  </Text>
                  {isActive ? (
                    <Text style={styles.teamPickActiveLabel}>
                      Équipe active
                    </Text>
                  ) : null}
                </View>
                {isActive ? (
                  <View style={styles.teamActiveBadge}>
                    <Feather
                      name="check"
                      size={14}
                      color={colors.onPrimary}
                    />
                  </View>
                ) : isSwitching ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => {
              setTeamSwitcherOpen(false);
              setTeamSheet({ mode: 'pick' });
            }}
            style={({ pressed }) => [
              styles.teamPickRow,
              styles.teamPickAddRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.teamPickAddIcon}>
              <Feather name="plus" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.teamName} numberOfLines={1}>
                Ajouter une équipe
              </Text>
              <Text style={styles.teamHint}>
                Code de club ou nouvelle équipe
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    identityCard: {
      alignItems: 'center',
      gap: 6,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: spacing.sm,
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraGlyph: { fontSize: 18 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: { ...typography.h2, color: c.textPrimary, textAlign: 'center' },
    nameEditHint: {
      ...typography.bodyBold,
      color: c.primary,
      fontSize: 18,
    },
    nameEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'stretch',
      paddingHorizontal: spacing.md,
    },
    nameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      ...typography.h3,
      color: c.textPrimary,
      backgroundColor: c.background,
      textAlign: 'center',
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnLabel: { color: c.onPrimary, fontWeight: '700', fontSize: 20 },
    iconBtnGhost: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnGhostLabel: {
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 22,
      lineHeight: 24,
    },
    email: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    error: {
      ...typography.caption,
      color: c.danger,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      textTransform: 'uppercase',
      fontWeight: '800',
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
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.h3,
      color: c.textPrimary,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnLabel: {
      color: c.onPrimary,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 20,
    },
    teamsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    teamCard: { marginBottom: spacing.sm },
    teamCardActive: {
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    teamActiveBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamChoice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.background,
    },
    teamChoiceTitle: {
      ...typography.bodyBold,
      color: c.textPrimary,
    },
    teamChoiceHint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    teamSheetActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    teamLogoWrap: {
      position: 'relative',
    },
    teamLogoPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
    },
    teamLogoPlaceholderGlyph: {
      fontSize: 24,
      color: c.primary,
      fontWeight: '700',
    },
    teamLogoBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamName: { ...typography.h3, color: c.textPrimary },
    teamHint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    teamSelect: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    teamPickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    teamPickRowActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    teamPickActiveLabel: {
      ...typography.caption,
      color: c.primary,
      marginTop: 2,
      fontWeight: '700',
    },
    teamPickAddRow: {
      borderStyle: 'dashed',
    },
    teamPickAddIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notesLoading: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    emptyTitle: {
      ...typography.bodyBold,
      color: c.textPrimary,
    },
    emptyHint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      lineHeight: 18,
    },
    noteCard: {},
    noteContent: {
      ...typography.body,
      color: c.textPrimary,
      lineHeight: 22,
    },
    noteFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    noteMeta: {
      ...typography.caption,
      color: c.textMuted,
    },
    noteToolbar: {
      flexDirection: 'row',
      gap: 6,
    },
    noteIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteIconLabel: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    noteIconDelete: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteDeleteLabel: { fontSize: 14 },
    noteInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      ...typography.body,
      color: c.textPrimary,
      backgroundColor: c.background,
    },
    noteInputMultiline: {
      minHeight: 96,
      paddingTop: 10,
    },
    noteActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.sm,
    },
  });
