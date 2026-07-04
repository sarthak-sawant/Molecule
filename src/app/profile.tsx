import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Chemistry User Badge Generator
const getUserBadge = (points: number) => {
  if (points >= 1500) return { title: "Noble Gas 👑", color: "#8B5CF6" };
  if (points >= 1000) return { title: "Covalent Master 🧪", color: "#10B981" };
  if (points >= 500) return { title: "Catalyst ⚡", color: "#F59E0B" };
  return { title: "Reactant ⚛️", color: "#6B7280" };
};

// Helper function to get alternative avatar URLs from the same URL
const getAvatarFallbacks = (primaryUrl: string) => {
  // Extract Pokemon ID from the URL
  const match = primaryUrl?.match(/\/(\d+)\.png$/);
  if (!match) return [primaryUrl];

  const pokemonId = match[1];
  return [
    primaryUrl, // Original URL from backend
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`, // Correct sprites path
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/${pokemonId}.png`, // Alternative without sprites/
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/back/${pokemonId}.png`, // Back sprite
  ];
};

export default function ProfileScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const activeColors = Colors[scheme === "dark" ? "dark" : "light"];
  const {
    user,
    login,
    signup,
    signupTeacher,
    logout,
    loading: authLoading,
  } = useAuth();

  const [authMode, setAuthMode] = useState<"login" | "signup" | "teacher">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      Alert.alert(
        "Incomplete Fields",
        "Please enter email, password, and username.",
      );
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username must be at least 3 characters.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await signup(email.trim(), password.trim(), username.trim());
      Alert.alert("Success!", "Your account has been created.");
      setAuthMode("login"); // Switch to login after signup
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeacherSignUp = async () => {
    if (
      !email.trim() ||
      !password.trim() ||
      !username.trim() ||
      !secretCode.trim()
    ) {
      Alert.alert(
        "Incomplete Fields",
        "Please fill all fields including the secret code.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await signupTeacher(email, password, username, secretCode);
      Alert.alert("Success!", "Your teacher account has been created.");
      setAuthMode("login"); // Switch to login after signup
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Incomplete Fields", "Please enter email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      Alert.alert(
        "Login Failed",
        err.message || "Check your credentials and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      Alert.alert("Signed Out", "You have been successfully logged out.");
    } catch (err: any) {
      console.error(err);
    }
  };

  const badge = user?.points ? getUserBadge(user.points) : null;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingBottom: BottomTabInset + Spacing.four,
    },
    web: {
      paddingBottom: Spacing.four,
    },
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: activeColors.backgroundElement },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Profile & Security ⚛️
        </Text>
        <Text style={styles.headerSub}>User Account Management</Text>
      </View>

      {authLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : user ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
        >
          <View style={styles.wrapper}>
            <View style={styles.profileContainer}>
              <View
                style={[
                  styles.profileCard,
                  { backgroundColor: activeColors.backgroundElement },
                ]}
              >
                <View style={{ position: "relative" }}>
                  {!imageError && user.avatar_url ? (
                    <>
                      {(() => {
                        const fallbacks = getAvatarFallbacks(user.avatar_url);
                        const currentUrl =
                          fallbacks[fallbackIndex] || user.avatar_url;
                        return (
                          <Image
                            source={{
                              uri: currentUrl,
                            }}
                            style={styles.avatar}
                            resizeMode="contain"
                            onError={() => {
                              console.log(
                                `❌ Image failed (attempt ${fallbackIndex + 1}):`,
                                currentUrl,
                              );
                              if (
                                fallbackIndex <
                                getAvatarFallbacks(user.avatar_url).length - 1
                              ) {
                                setFallbackIndex(fallbackIndex + 1);
                              } else {
                                setImageError(true);
                                setImageLoading(false);
                              }
                            }}
                            onLoad={() => {
                              console.log(
                                "✅ Image loaded successfully:",
                                currentUrl,
                              );
                              setImageLoading(false);
                            }}
                          />
                        );
                      })()}
                      {imageLoading && (
                        <View
                          style={[
                            styles.avatar,
                            {
                              position: "absolute",
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: "rgba(16, 185, 129, 0.2)",
                            },
                          ]}
                        >
                          <ActivityIndicator color="#10B981" />
                        </View>
                      )}
                    </>
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        {
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: imageError ? "#FCA5A5" : "#10B981",
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 40 }}>
                        {imageError ? "⚠️" : "🧪"}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.usernameText, { color: theme.text }]}>
                  u/{user.username || "Unknown"}
                </Text>
                <Text
                  style={[styles.emailText, { color: theme.textSecondary }]}
                >
                  {user.email}
                </Text>
                {!user.username && (
                  <Text
                    style={[
                      styles.emailText,
                      { color: "#EF4444", marginTop: 8 },
                    ]}
                  >
                    ⚠️ Username missing - check console logs
                  </Text>
                )}

                <View style={styles.pointsBox}>
                  <Text style={styles.pointsTitle}>Chemistry Score</Text>
                  <Text style={styles.pointsValue}>
                    🧪 {user.points || 0} pts
                  </Text>
                  {badge && (
                    <View
                      style={[
                        styles.badgeIndicator,
                        { backgroundColor: badge.color },
                      ]}
                    >
                      <Text style={styles.badgeIndicatorText}>
                        {badge.title}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.securityPanel,
                  { backgroundColor: activeColors.backgroundElement },
                ]}
              >
                <Text style={[styles.panelTitle, { color: theme.text }]}>
                  🛡️ Security Stack active
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletIcon}>✓</Text>
                  <Text
                    style={[styles.bulletText, { color: theme.textSecondary }]}
                  >
                    <Text style={{ fontWeight: "700", color: theme.text }}>
                      JWT Client Session:
                    </Text>{" "}
                    Encrypted and saved locally using iOS Keychain / Android
                    Keystore (SecureStore) to prevent auth token spoofing.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletIcon}>✓</Text>
                  <Text
                    style={[styles.bulletText, { color: theme.textSecondary }]}
                  >
                    <Text style={{ fontWeight: "700", color: theme.text }}>
                      Row Level Security (RLS):
                    </Text>{" "}
                    Database policies active. Users can only insert/delete their
                    own questions, and only mutate their own profile details.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletIcon}>✓</Text>
                  <Text
                    style={[styles.bulletText, { color: theme.textSecondary }]}
                  >
                    <Text style={{ fontWeight: "700", color: theme.text }}>
                      SQL Injection Proof:
                    </Text>{" "}
                    Backend uses parameterized queries to prevent SQL injection
                    attacks.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutBtnText}>Log Out Session ✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
        >
          <View style={styles.wrapper}>
            <View
              style={[
                styles.tabSelector,
                { backgroundColor: activeColors.backgroundElement },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  authMode === "login" && styles.activeTabBtn,
                ]}
                onPress={() => setAuthMode("login")}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    authMode === "login" && styles.activeTabLabel,
                  ]}
                >
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  authMode === "signup" && styles.activeTabBtn,
                ]}
                onPress={() => setAuthMode("signup")}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    authMode === "signup" && styles.activeTabLabel,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  authMode === "teacher" && styles.activeTabBtn,
                  {
                    backgroundColor:
                      authMode === "teacher" ? "#8B5CF6" : undefined,
                  },
                ]}
                onPress={() => setAuthMode("teacher")}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    authMode === "teacher" && styles.activeTabLabel,
                  ]}
                >
                  Teacher
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formBox}>
              {authMode !== "login" && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Chemist Username
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: theme.text,
                        backgroundColor: activeColors.backgroundElement,
                        borderColor: activeColors.backgroundSelected,
                      },
                    ]}
                    placeholder="e.g. Mendeleev_99"
                    placeholderTextColor={theme.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Email Address
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                  },
                ]}
                placeholder="e.g. marie@curie.edu"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                  },
                ]}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />

              {authMode === "teacher" && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Teacher Secret Code
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: theme.text,
                        backgroundColor: activeColors.backgroundElement,
                        borderColor: activeColors.backgroundSelected,
                      },
                    ]}
                    placeholder="Enter the admin-provided code"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    value={secretCode}
                    onChangeText={setSecretCode}
                    autoCapitalize="none"
                  />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: submitting
                      ? "#6B7280"
                      : authMode === "teacher"
                        ? "#8B5CF6"
                        : "#10B981",
                  },
                ]}
                onPress={
                  authMode === "login"
                    ? handleLogin
                    : authMode === "signup"
                      ? handleSignUp
                      : handleTeacherSignUp
                }
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {authMode === "login"
                      ? "Authenticate 🧪"
                      : authMode === "signup"
                        ? "Register Account ⚛️"
                        : "Register as Teacher �‍🏫"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.guideBox,
                { backgroundColor: activeColors.backgroundElement },
              ]}
            >
              <Text style={[styles.guideTitle, { color: theme.text }]}>
                🔑 Setup Essentials:
              </Text>
              <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                To use the app with your own backend and database:
                {"\n\n"}
                1. Make sure you have set up the backend server and MySQL
                database
                {"\n"}
                2. Run the mysql_schema.sql to initialize your database
                {"\n"}
                3. Configure backend/.env with your database credentials
                {"\n"}
                4. Start the backend server before using the app
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: "row",
    justifyContent: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  profileContainer: {
    flexDirection: "column",
    gap: Spacing.four,
  },
  profileCard: {
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "800",
  },
  emailText: {
    fontSize: 13,
  },
  pointsBox: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  pointsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F59E0B",
    marginVertical: 4,
  },
  badgeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeIndicatorText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  securityPanel: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: 12,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulletIcon: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 14,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutBtnText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 13,
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabBtn: {
    backgroundColor: "#10B981",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  activeTabLabel: {
    color: "#FFF",
  },
  formBox: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  textInput: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  guideBox: {
    borderRadius: 14,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  guideText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
