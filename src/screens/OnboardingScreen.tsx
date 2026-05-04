import React, { useState } from 'react';
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
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClubLogo } from '@/components/ClubLogo';
import { useAuth } from '@/context/AuthContext';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Mode = 'pick' | 'claim' | 'create';

export function OnboardingScreen() {
  const { signOut, claimTeam, createTeam, session } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>('pick');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitClaim = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Indique ton nom (visible dans l\'app).');
      return;
    }
    if (!code.trim()) {
      setError('Saisis le code partagé par ton club.');
      return;
    }
    setBusy(true);
    try {
      await claimTeam(code, displayName);
    } catch (err: any) {
      setError(err?.message ?? 'Le rattachement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Indique ton nom (visible dans l\'app).');
      return;
    }
    if (!teamName.trim()) {
      setError('Donne un nom à ton équipe.');
      return;
    }
    setBusy(true);
    try {
      await createTeam(teamName, displayName);
    } catch (err: any) {
      setError(err?.message ?? 'La création a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <ClubLogo size={56} />
            <Text style={styles.title}>Bienvenue !</Text>
            <Text style={styles.subtitle}>
              {session?.user?.email
                ? `Connecté en ${session.user.email}.`
                : ''}
              {'\n'}
              Avant de commencer, dis-nous quelle équipe tu coaches.
            </Text>
          </View>

          {mode === 'pick' ? (
            <View style={{ gap: spacing.md }}>
              <Pressable
                onPress={() => {
                  setError(null);
                  setMode('claim');
                }}
                style={({ pressed }) => [
                  styles.choice,
                  pressed && styles.choicePressed,
                ]}
              >
                <Text style={styles.choiceTitle}>J'ai un code d'équipe</Text>
                <Text style={styles.choiceHint}>
                  Pour rejoindre une équipe déjà existante (par ex. transmise
                  par ton club).
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setError(null);
                  setMode('create');
                }}
                style={({ pressed }) => [
                  styles.choice,
                  pressed && styles.choicePressed,
                ]}
              >
                <Text style={styles.choiceTitle}>Créer une nouvelle équipe</Text>
                <Text style={styles.choiceHint}>
                  Tu démarres avec une page blanche : ajoute tes joueurs et
                  c'est parti.
                </Text>
              </Pressable>
            </View>
          ) : null}

          {mode === 'claim' ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Rejoindre une équipe</Text>
              <Text style={styles.label}>Ton nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Prénom Nom"
                placeholderTextColor={'#8E8E93'}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!busy}
              />
              <Text style={styles.label}>Code d'équipe</Text>
              <TextInput
                style={styles.input}
                placeholder="ABCD-1234"
                placeholderTextColor={'#8E8E93'}
                autoCapitalize="characters"
                autoCorrect={false}
                value={code}
                onChangeText={setCode}
                editable={!busy}
                onSubmitEditing={submitClaim}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={{ height: spacing.md }} />
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <Button
                    label="Retour"
                    variant="secondary"
                    onPress={() => setMode('pick')}
                  />
                  <View style={{ width: spacing.sm }} />
                  <Button label="Rejoindre" onPress={submitClaim} />
                </View>
              )}
            </Card>
          ) : null}

          {mode === 'create' ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Créer ton équipe</Text>
              <Text style={styles.label}>Ton nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Prénom Nom"
                placeholderTextColor={'#8E8E93'}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!busy}
              />
              <Text style={styles.label}>Nom de l'équipe</Text>
              <TextInput
                style={styles.input}
                placeholder="Mon équipe FC"
                placeholderTextColor={'#8E8E93'}
                value={teamName}
                onChangeText={setTeamName}
                editable={!busy}
                onSubmitEditing={submitCreate}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={{ height: spacing.md }} />
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <Button
                    label="Retour"
                    variant="secondary"
                    onPress={() => setMode('pick')}
                  />
                  <View style={{ width: spacing.sm }} />
                  <Button label="Créer" onPress={submitCreate} />
                </View>
              )}
            </Card>
          ) : null}

          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutLabel}>Se déconnecter</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: {
      padding: spacing.lg,
      paddingTop: spacing.xxl,
      gap: spacing.lg,
    },
    brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    title: { ...typography.largeTitle, color: c.textPrimary },
    subtitle: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      lineHeight: 22,
    },
    choice: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    choicePressed: { opacity: 0.85 },
    choiceTitle: { ...typography.h3, color: c.textPrimary },
    choiceHint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    card: {},
    cardTitle: {
      ...typography.h3,
      color: c.textPrimary,
      marginBottom: spacing.sm,
    },
    label: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: spacing.sm,
      marginBottom: 6,
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
    error: { ...typography.caption, color: c.danger, marginTop: spacing.sm },
    busy: { paddingVertical: spacing.md, alignItems: 'center' },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    signOut: { alignSelf: 'center', padding: spacing.md, marginTop: spacing.md },
    signOutLabel: {
      ...typography.caption,
      color: c.textMuted,
      textDecorationLine: 'underline',
    },
  });
