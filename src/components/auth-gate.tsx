import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'login' | 'signup' | 'signup-teacher';

export default function AuthGate() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const activeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { login, signup, signupTeacher } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in username, email and password.');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email.trim(), password.trim(), username.trim());
      Alert.alert('Success!', 'Your account has been created. Please login to continue.');
      setMode('login');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUpTeacher = async () => {
    if (!email.trim() || !password.trim() || !username.trim() || !secretCode.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in all fields including the secret code.');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signupTeacher(email.trim(), password.trim(), username.trim(), secretCode.trim());
      Alert.alert('Success!', 'Your teacher account has been created. Please login to continue.');
      setMode('login');
      setSecretCode('');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Incomplete Fields', 'Please enter email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <Text style={[styles.brandLogo, { color: theme.text }]}>⌬</Text>
            <Text style={[styles.brandName, { color: theme.text }]}>Molecule</Text>
            <Text style={styles.brandTagline}>Chemistry Q&A Community</Text>
          </View>

          <View style={[styles.card, { backgroundColor: activeColors.backgroundElement }]}>
            <View style={[styles.modeRow, { backgroundColor: theme.background }]}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.modeLabel, mode === 'login' && styles.modeLabelActive]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.modeLabel, mode === 'signup' && styles.modeLabelActive]}>
                  Student Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'signup-teacher' && styles.modeBtnActive]}
                onPress={() => setMode('signup-teacher')}
              >
                <Text style={[styles.modeLabel, mode === 'signup-teacher' && styles.modeLabelActive]}>
                  Teacher Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {mode === 'login'
                ? 'Welcome Back'
                : mode === 'signup-teacher'
                  ? 'Create Teacher Account'
                  : 'Create Student Account'}
            </Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              {mode === 'login'
                ? 'Sign in to continue to Molecule'
                : 'Join the chemistry community and start learning!'}
            </Text>

            {(mode === 'signup' || mode === 'signup-teacher') && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Chemist Username</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: activeColors.backgroundSelected,
                    },
                  ]}
                  placeholder="e.g. Mendeleev_99"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </>
            )}

            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: activeColors.backgroundSelected,
                },
              ]}
              placeholder="marie@curie.edu"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: activeColors.backgroundSelected,
                },
              ]}
              placeholder="Min 6 characters"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />

            {mode === 'signup-teacher' && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Teacher Secret Code</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: activeColors.backgroundSelected,
                    },
                  ]}
                  placeholder="Ask your admin for this"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={secretCode}
                  onChangeText={setSecretCode}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: submitting ? '#6B7280' : '#10B981' }]}
              onPress={
                mode === 'login'
                  ? handleLogin
                  : mode === 'signup'
                    ? handleSignUp
                    : handleSignUpTeacher
              }
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login'
                    ? 'Authenticate 🧪'
                    : mode === 'signup-teacher'
                      ? 'Create Teacher Account 👨‍🏫'
                      : 'Register Account ⚛️'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            🔒 Secured with JWT Auth · Sessions stored in device Keychain
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  brandRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.two,
  },
  brandLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#10B981',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    marginBottom: Spacing.one,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#10B981',
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  modeLabelActive: {
    color: '#FFF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.two,
  },
});
