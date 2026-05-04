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
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Mode = 'signIn' | 'signUp';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (password.length < 6) {
      setError('Mot de passe : 6 caractères minimum.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setInfo(
          'Compte créé. Si la confirmation par email est activée, vérifie ta boîte mail puis reviens te connecter.',
        );
      }
    } catch (err: any) {
      const raw: string = err?.message ?? 'Erreur inconnue.';
      // Friendlier translations of the most common Supabase Auth
      // errors so the coach gets actionable feedback instead of
      // English jargon.
      const friendly =
        /already registered|already exists/i.test(raw)
          ? 'Cette adresse a déjà un compte. Connecte-toi avec ce mot de passe ou utilise une autre adresse.'
          : /Invalid login credentials/i.test(raw)
          ? 'Email ou mot de passe incorrect.'
          : /Email not confirmed/i.test(raw)
          ? 'Email non confirmé. Vérifie ta boîte mail ou demande à l\'admin de désactiver la confirmation.'
          : raw;
      setError(friendly);
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
            <AppLogo size={72} />
            <Text style={styles.title}>Coach Hub</Text>
            <Text style={styles.subtitle}>
              Présences, stats et matchs synchronisés avec ton équipe.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.tabs}>
              <Pressable
                onPress={() => setMode('signIn')}
                style={[styles.tab, mode === 'signIn' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    mode === 'signIn' && styles.tabLabelActive,
                  ]}
                >
                  Connexion
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('signUp')}
                style={[styles.tab, mode === 'signUp' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    mode === 'signUp' && styles.tabLabelActive,
                  ]}
                >
                  Créer un compte
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="coach@club.ch"
              placeholderTextColor={'#8E8E93'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={'#8E8E93'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <View style={{ height: spacing.md }} />
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator />
              </View>
            ) : (
              <Button
                label={mode === 'signIn' ? 'Se connecter' : 'Créer le compte'}
                onPress={submit}
                fullWidth
              />
            )}
          </Card>

          <Text style={styles.footer}>
            Chaque coach a son propre profil. Tes données ne sont visibles
            que par toi.{'\n'}
            Si tu utilises déjà cette adresse sur une autre app du même
            cloud, connecte-toi avec ce mot de passe — sinon, choisis une
            autre adresse.
          </Text>
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
    },
    card: { gap: 0 },
    tabs: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: c.background,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    tabLabel: {
      ...typography.bodyBold,
      color: c.textSecondary,
      fontSize: 14,
    },
    tabLabelActive: { color: c.onPrimary },
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
    error: {
      ...typography.caption,
      color: c.danger,
      marginTop: spacing.sm,
    },
    info: {
      ...typography.caption,
      color: c.successText,
      marginTop: spacing.sm,
    },
    busy: { paddingVertical: spacing.md, alignItems: 'center' },
    footer: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
