import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthGate from '@/components/auth-gate';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

function AppContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  if (loading) {
    // Tiny spinner while the persisted session is being read from SecureStore.
    // This prevents any flash of the app OR the login screen.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {user ? <AppTabs /> : <AuthGate />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
