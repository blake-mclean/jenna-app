import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useApp();

  const [mode, setMode]               = useState<Mode>('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [checkEmail, setCheckEmail]   = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setCheckEmail(false);
  }

  async function handleSubmit() {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password)      { setError('Please enter your password.'); return; }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        // onAuthStateChange in AppContext handles data loading
        // Index screen will redirect once session is set
      } else {
        const { emailConfirmationRequired } = await signUp(email.trim(), password);
        if (emailConfirmationRequired) {
          setCheckEmail(true);
          return;
        }
        // Auto-confirmed: onAuthStateChange handles the rest
      }
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('User already registered')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Check-email confirmation screen ───────────────────────────────────────
  if (checkEmail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.checkEmailWrap}>
          <Text style={styles.checkEmailIcon}>📬</Text>
          <Text style={styles.checkEmailTitle}>Check your email</Text>
          <Text style={styles.checkEmailBody}>
            We sent a confirmation link to{'\n'}
            <Text style={{ color: COLORS.primary }}>{email}</Text>
            {'\n\n'}Tap the link to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity style={styles.backToSignIn} onPress={() => switchMode('signin')}>
            <Text style={styles.backToSignInText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={[COLORS.primary, '#00A882']}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoIcon}>🚴</Text>
            </LinearGradient>
            <Text style={styles.appName}>JENNA</Text>
            <Text style={styles.tagline}>Your personal cycling companion</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => switchMode(m)}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error !== '' && (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitWrap, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, '#00A882']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.black} />
                  : <Text style={styles.submitText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={styles.legal}>
                Your ride data will be securely synced across your devices.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // ── Check email ──
  checkEmailWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  checkEmailIcon: { fontSize: 64, marginBottom: SPACING.lg },
  checkEmailTitle: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  checkEmailBody: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  backToSignIn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backToSignInText: {
    fontSize: FONT.size.md,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  // ── Main form ──
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  logoIcon: { fontSize: 42 },
  appName: {
    fontSize: 36,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: { color: COLORS.black },

  form: { gap: SPACING.md },
  fieldWrap: { gap: SPACING.xs },
  fieldLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT.size.md,
    color: COLORS.textPrimary,
    flex: 1,
    minHeight: 48,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  passwordInput: { flex: 1 },
  showBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  showBtnText: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  errorWrap: {
    backgroundColor: COLORS.record + '20',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.record + '60',
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: FONT.size.sm,
    color: COLORS.record,
    textAlign: 'center',
  },

  submitWrap: { marginTop: SPACING.xs },
  submitBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  submitText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
  },

  legal: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
