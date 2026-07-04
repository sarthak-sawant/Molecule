import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Chemistry User Badge Generator
const getUserBadge = (points: number) => {
  if (points >= 1500) return { title: "Noble Gas 👑", color: "#8B5CF6" }; // Purple
  if (points >= 1000) return { title: "Covalent Master 🧪", color: "#10B981" }; // Emerald
  if (points >= 500) return { title: "Catalyst ⚡", color: "#F59E0B" }; // Amber
  return { title: "Reactant ⚛️", color: "#6B7280" }; // Gray
};

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  points: number;
}

interface Question {
  id: string;
  title: string;
  content: string;
  group_id?: string;
  author_id: string;
  created_at: string;
  author: Profile;
  group_name?: string;
  answers_count: number;
}

interface Answer {
  id: string;
  question_id: string;
  content: string;
  author_id: string;
  is_accepted: boolean;
  created_at: string;
  author: Profile;
  upvotes_count: number;
  has_upvoted: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  pdf_url: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  file_url?: string;
  author_id: string;
  created_at: string;
  username: string;
  avatar_url?: string;
}

export default function FeedScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const safeAreaInsets = useSafeAreaInsets();
  const activeColors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();

  // Global App States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isManagingKB, setIsManagingKB] = useState(false);
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Content Forms
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newQuestionGroupId, setNewQuestionGroupId] = useState("");
  const [newAnswerContent, setNewAnswerContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // KB Form State
  const [kbTitle, setKbTitle] = useState("");
  const [kbDescription, setKbDescription] = useState("");
  const [kbCategory, setKbCategory] = useState("");
  const [kbUrl, setKbUrl] = useState("");

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  // KB Form File State
  const [selectedKBFile, setSelectedKBFile] = useState<any>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, questionsData, noticesData] = await Promise.all([
        api.getGroups(),
        api.getQuestions(),
        api.getNotices(),
      ]);
      setGroups(groupsData as Group[]);
      setQuestions(questionsData as Question[]);
      setNotices(noticesData as Notice[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        console.log("Selected file (notice):", result.assets[0]);
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking file:", error);
    }
  };

  const pickKBFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        console.log("Selected file (KB):", result.assets[0]);
        setSelectedKBFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking file for KB:", error);
    }
  };

  const handleSaveKBItem = async () => {
    if (!kbTitle.trim() || !kbCategory.trim()) {
      Alert.alert("Incomplete Fields", "Please fill in the title and category.");
      return;
    }
    if (!user || user.role !== "teacher") {
      Alert.alert(
        "Permission Denied",
        "Only teachers can add to the knowledge base.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.createKnowledgeBaseEntry(
        kbTitle,
        kbDescription,
        kbCategory,
        kbUrl,
        selectedKBFile
      );
      Alert.alert("Success", "Knowledge base item saved!");
      setIsManagingKB(false);
      setKbTitle("");
      setKbDescription("");
      setKbCategory("");
      setKbUrl("");
      setSelectedKBFile(null);
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNotice = async () => {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      Alert.alert("Incomplete Fields", "Please fill in the title and content.");
      return;
    }
    setSubmitting(true);
    try {
      const newNotice = await api.createNotice(
        noticeTitle,
        noticeContent,
        selectedFile
      );
      setNotices((prev) => [newNotice, ...prev]);
      Alert.alert("Success", "Notice posted successfully!");
      setIsCreatingNotice(false);
      setNoticeTitle("");
      setNoticeContent("");
      setSelectedFile(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to post notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    Alert.alert(
      "Delete Notice",
      "Are you sure you want to delete this notice?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteNotice(noticeId);
              setNotices((prev) => prev.filter((n) => n.id !== noticeId));
              Alert.alert("Success", "Notice deleted successfully!");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete notice.");
            }
          },
        },
      ]
    );
  };

  // Fetch answers for selected question
  const fetchAnswers = async (questionId: string) => {
    try {
      const answersData = await api.getAnswers(questionId);
      setAnswers(answersData as Answer[]);
    } catch (error) {
      console.error("Error fetching answers:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Question
  const handleAskQuestion = async () => {
    if (!newQuestionTitle.trim() || !newQuestionContent.trim()) {
      Alert.alert(
        "Incomplete Fields",
        "Please fill in both the title and chemistry question details.",
      );
      return;
    }
    if (!user) {
      Alert.alert("Login Required", "Please log in to ask a question.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createQuestion(
        newQuestionTitle,
        newQuestionContent,
        newQuestionGroupId || undefined,
      );
      await fetchData();
      Alert.alert("Success", "Chemistry question published!");
      setIsAskingQuestion(false);
      setNewQuestionTitle("");
      setNewQuestionContent("");
      setNewQuestionGroupId("");
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err.message || "Error occurred while saving question.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Answer
  const handlePostAnswer = async () => {
    if (!selectedQuestion) return;
    if (!newAnswerContent.trim()) {
      Alert.alert("Empty Answer", "Please enter your answer text.");
      return;
    }
    if (!user) {
      Alert.alert("Login Required", "Please log in to answer.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createAnswer(selectedQuestion.id, newAnswerContent);
      await fetchAnswers(selectedQuestion.id);
      setNewAnswerContent("");
      Alert.alert("Success", "Answer posted successfully!");
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err.message || "Error occurred while saving answer.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Upvote/Like Answer
  const handleToggleUpvote = async (answerId: string) => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to upvote answers.",
      );
      return;
    }

    try {
      const targetAnswer = answers.find((a) => a.id === answerId);
      if (!targetAnswer) return;

      if (targetAnswer.has_upvoted) {
        await api.removeUpvote(answerId);
      } else {
        await api.upvoteAnswer(answerId);
      }
      await fetchAnswers(selectedQuestion?.id || answerId);
    } catch (err: any) {
      console.error("Error toggling upvote:", err);
    }
  };

  // Accept Answer
  const handleAcceptAnswer = async (answerId: string) => {
    if (!user) {
      Alert.alert("Authentication Required", "Please log in.");
      return;
    }
    if (!selectedQuestion || selectedQuestion.author_id !== user.id) {
      Alert.alert(
        "Permission Denied",
        "Only the creator of this question can mark answers as helpful.",
      );
      return;
    }

    try {
      await api.acceptAnswer(answerId);
      await fetchAnswers(selectedQuestion.id);
      Alert.alert("Success", "Answer helpful status updated!");
    } catch (err: any) {
      Alert.alert("Action Failed", err.message || "Error occurred.");
    }
  };
  // Filtered lists
  const filteredQuestions = questions.filter((q) => {
    const matchesGroup = selectedGroupFilter
      ? q.group_id === selectedGroupFilter
      : true;
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

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
      {/* 1. HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: activeColors.backgroundElement },
        ]}
      >
        <View style={styles.brandContainer}>
          <Text style={[styles.brandText, { color: theme.text }]}>
            Molecule ⌬
          </Text>
          <Text style={styles.brandSubtext}>Chemistry Q&A</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Connected
          </Text>
        </View>
      </View>

      {/* 2. BODY CONTENT */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Fusing Atoms...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
        >
          <View style={styles.wrapper}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchSection,
                {
                  backgroundColor: activeColors.backgroundElement,
                  borderColor: activeColors.backgroundSelected,
                },
              ]}
            >
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search compounds, equations, kinetics..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== "" && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text
                    style={{ color: theme.textSecondary, paddingHorizontal: 5 }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Filter Groups Row */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, { color: theme.text }]}>
                Sub-Molecules:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.groupTabs}
              >
                <TouchableOpacity
                  style={[
                    styles.groupTab,
                    {
                      backgroundColor:
                        selectedGroupFilter === null
                          ? "#10B981"
                          : activeColors.backgroundElement,
                    },
                  ]}
                  onPress={() => setSelectedGroupFilter(null)}
                >
                  <Text
                    style={[
                      styles.groupTabLabel,
                      {
                        color:
                          selectedGroupFilter === null ? "#FFF" : theme.text,
                      },
                    ]}
                  >
                    🧪 All Feed
                  </Text>
                </TouchableOpacity>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.groupTab,
                      {
                        backgroundColor:
                          selectedGroupFilter === g.id
                            ? "#10B981"
                            : activeColors.backgroundElement,
                      },
                    ]}
                    onPress={() => setSelectedGroupFilter(g.id)}
                  >
                    <Text
                      style={[
                        styles.groupTabLabel,
                        {
                          color:
                            selectedGroupFilter === g.id ? "#FFF" : theme.text,
                        },
                      ]}
                    >
                      ⌬ r/{g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Ask Question trigger button (only for non-teachers) */}
            {user?.role !== "teacher" && (
              <TouchableOpacity
                style={styles.askButton}
                onPress={() => {
                  if (!user) {
                    Alert.alert(
                      "Login Required",
                      "Please log in to ask questions.",
                    );
                  } else {
                    setIsAskingQuestion(true);
                  }
                }}
              >
                <Text style={styles.askButtonText}>+ Ask Chemistry Question</Text>
              </TouchableOpacity>
            )}

            {/* Teacher: Post Notice */}
            {user?.role === "teacher" && (
              <TouchableOpacity
                style={[
                  styles.askButton,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "#EF4444",
                  },
                ]}
                onPress={() => setIsCreatingNotice(true)}
              >
                <Text style={[styles.askButtonText, { color: "#EF4444" }]}>
                  + Post Notice / Advisory
                </Text>
              </TouchableOpacity>
            )}

            {/* Editor: Add to Knowledge Base */}
            {user?.role === "teacher" && (
              <TouchableOpacity
                style={[
                  styles.askButton,
                  {
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    borderColor: "#8B5CF6",
                  },
                ]}
                onPress={() => setIsManagingKB(true)}
              >
                <Text style={[styles.askButtonText, { color: "#8B5CF6" }]}>
                  + Add to Knowledge Base
                </Text>
              </TouchableOpacity>
            )}

            {/* Notices List */}
            {notices.map((notice) => (
              <View
                key={notice.id}
                style={[
                  styles.questionCard,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.05)",
                    borderColor: "#EF4444",
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.authorRow}>
                    <View
                      style={[
                        styles.avatarIndicator,
                        { backgroundColor: "#EF4444" },
                      ]}
                    />
                    <Text style={[styles.authorName, { color: theme.text }]}>
                      {notice.username}
                    </Text>
                    <Text style={[styles.badgeText, { color: "#EF4444" }]}>
                      [Teacher]
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.groupTag, { color: "#EF4444" }]}>
                      Notice
                    </Text>
                    {user?.role === "teacher" && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteNotice(notice.id);
                        }}
                      >
                        <Text style={{ color: "#EF4444", fontSize: 18 }}>
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Text
                  style={[styles.questionCardTitle, { color: theme.text }]}
                >
                  {notice.title}
                </Text>
                <Text
                  style={[
                    styles.questionSnippet,
                    { color: theme.textSecondary },
                  ]}
                  numberOfLines={3}
                >
                  {notice.content}
                </Text>

                {notice.file_url && (
                  <TouchableOpacity
                    style={[
                      styles.askButton,
                      {
                        marginTop: 8,
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderColor: "#EF4444",
                      },
                    ]}
                    onPress={async () => {
                      const fileUrl = `${process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3002"}${notice.file_url}`;
                      await WebBrowser.openBrowserAsync(fileUrl);
                    }}
                  >
                    <Text style={{ color: "#EF4444", fontWeight: "600" }}>
                      📎 View Attached File
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.timestamp,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {new Date(notice.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⚛️</Text>
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  No reactions found
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: theme.textSecondary }]}
                >
                  Be the catalyst! Post a question or adjust your search filter.
                </Text>
              </View>
            ) : (
              filteredQuestions.map((q) => {
                const authorProfile = q.author;
                const badge = getUserBadge(authorProfile?.points || 0);

                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[
                      styles.questionCard,
                      {
                        backgroundColor: activeColors.backgroundElement,
                        borderColor: activeColors.backgroundSelected,
                      },
                    ]}
                    onPress={async () => {
                      setSelectedQuestion(q);
                      await fetchAnswers(q.id);
                    }}
                  >
                    {/* Card Header info */}
                    <View style={styles.cardHeader}>
                      <View style={styles.authorRow}>
                        <View
                          style={[
                            styles.avatarIndicator,
                            { backgroundColor: badge.color },
                          ]}
                        />
                        <Text
                          style={[styles.authorName, { color: theme.text }]}
                        >
                          u/{authorProfile?.username || "chemist"}
                        </Text>
                        <Text
                          style={[styles.badgeText, { color: badge.color }]}
                        >
                          [{badge.title}]
                        </Text>
                      </View>
                      <Text style={[styles.groupTag, { color: "#10B981" }]}>
                        r/{q.group_name || "General"}
                      </Text>
                    </View>

                    {/* Question Title & Snippet */}
                    <Text
                      style={[styles.questionCardTitle, { color: theme.text }]}
                    >
                      {q.title}
                    </Text>
                    <Text
                      style={[
                        styles.questionSnippet,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={3}
                    >
                      {q.content}
                    </Text>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <Text
                        style={[
                          styles.answersCount,
                          { color: theme.textSecondary },
                        ]}
                      >
                        💬 {q.answers_count || 0} answers
                      </Text>
                      <Text
                        style={[
                          styles.timestamp,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {new Date(q.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* 3. MODAL: ASK QUESTION */}
      <Modal
        visible={isAskingQuestion}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAskingQuestion(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.background,
                borderColor: activeColors.backgroundSelected,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: activeColors.backgroundElement },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Synthesize Question
              </Text>
              <TouchableOpacity
                onPress={() => setIsAskingQuestion(false)}
                style={styles.closeBtn}
              >
                <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: Spacing.three }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Title / Equation
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
                placeholder="e.g. Balancing copper oxidation under acidic conditions..."
                placeholderTextColor={theme.textSecondary}
                value={newQuestionTitle}
                onChangeText={setNewQuestionTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Details / Reaction Mechanism
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                  },
                ]}
                multiline
                numberOfLines={6}
                placeholder="Write your chemistry equation, reactions, variables, or explanations..."
                placeholderTextColor={theme.textSecondary}
                value={newQuestionContent}
                onChangeText={setNewQuestionContent}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Sub-Molecule Group
              </Text>
              <View style={styles.pickerContainer}>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.pickerItem,
                      {
                        backgroundColor:
                          newQuestionGroupId === g.id
                            ? "#10B981"
                            : activeColors.backgroundElement,
                      },
                    ]}
                    onPress={() => setNewQuestionGroupId(g.id)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        {
                          color:
                            newQuestionGroupId === g.id ? "#FFF" : theme.text,
                        },
                      ]}
                    >
                      r/{g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor:
                        newQuestionGroupId === ""
                          ? "#10B981"
                          : activeColors.backgroundElement,
                    },
                  ]}
                  onPress={() => setNewQuestionGroupId("")}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      {
                        color: newQuestionGroupId === "" ? "#FFF" : theme.text,
                      },
                    ]}
                  >
                    General Q&A
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: submitting ? "#6B7280" : "#10B981" },
                ]}
                onPress={handleAskQuestion}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Post Question ⚛️</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. MODAL: MANAGE KNOWLEDGE BASE (Editors only) */}
      <Modal
        visible={isManagingKB}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsManagingKB(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.background,
                borderColor: activeColors.backgroundSelected,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: activeColors.backgroundElement },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Knowledge Item
              </Text>
              <TouchableOpacity
                onPress={() => setIsManagingKB(false)}
                style={styles.closeBtn}
              >
                <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: Spacing.three }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Title
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
                placeholder="e.g. Organic Chemistry Fundamentals"
                placeholderTextColor={theme.textSecondary}
                value={kbTitle}
                onChangeText={setKbTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                    height: 80,
                  },
                ]}
                multiline
                placeholder="A brief summary of the content..."
                placeholderTextColor={theme.textSecondary}
                value={kbDescription}
                onChangeText={setKbDescription}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Category
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
                placeholder="e.g. Organic Chemistry, Textbook"
                placeholderTextColor={theme.textSecondary}
                value={kbCategory}
                onChangeText={setKbCategory}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                PDF or Resource URL (or use file below)
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
                placeholder="https://example.com/notes.pdf"
                placeholderTextColor={theme.textSecondary}
                value={kbUrl}
                onChangeText={setKbUrl}
                keyboardType="url"
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Or Upload File
              </Text>
              <TouchableOpacity
                style={[
                  styles.askButton,
                  {
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    borderColor: "#8B5CF6",
                  },
                ]}
                onPress={pickKBFile}
              >
                <Text style={[styles.askButtonText, { color: "#8B5CF6" }]}>
                  {selectedKBFile
                    ? `Selected: ${selectedKBFile.name}`
                    : "+ Choose File"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: submitting ? "#6B7280" : "#8B5CF6" },
                ]}
                onPress={handleSaveKBItem}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save to KB 📚</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Create Notice */}
      <Modal
        visible={isCreatingNotice}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreatingNotice(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.background,
                borderColor: activeColors.backgroundSelected,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: activeColors.backgroundElement },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Post Notice / Advisory
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreatingNotice(false)}
                style={styles.closeBtn}
              >
                <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: Spacing.three }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Title
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
                placeholder="Enter notice title"
                placeholderTextColor={theme.textSecondary}
                value={noticeTitle}
                onChangeText={setNoticeTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Content
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                  },
                ]}
                multiline
                numberOfLines={6}
                placeholder="Enter notice content"
                placeholderTextColor={theme.textSecondary}
                value={noticeContent}
                onChangeText={setNoticeContent}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Attachment (Optional)
              </Text>
              <TouchableOpacity
                style={[
                  styles.askButton,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "#EF4444",
                  },
                ]}
                onPress={pickFile}
              >
                <Text
                  style={[styles.askButtonText, { color: "#EF4444" }]}
                >
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : "+ Choose File"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: submitting ? "#6B7280" : "#EF4444" },
                ]}
                onPress={handleCreateNotice}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Post Notice</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. MODAL: QUESTION DETAIL & ANSWERS */}
      <Modal
        visible={selectedQuestion !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedQuestion(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.background,
                borderColor: activeColors.backgroundSelected,
              },
            ]}
          >
            {selectedQuestion && (
              <>
                {/* Detail Header */}
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: activeColors.backgroundElement },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailHeaderTag}>
                      r/{selectedQuestion.group_name || "General"}
                    </Text>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: theme.text, fontSize: 16 },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedQuestion.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedQuestion(null)}
                    style={styles.closeBtn}
                  >
                    <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Detail Scroll Content */}
                <ScrollView style={{ padding: Spacing.three }}>
                  {/* Author metadata */}
                  <View style={styles.detailAuthorSection}>
                    <Text
                      style={[styles.detailAuthorName, { color: theme.text }]}
                    >
                      Asked by u/
                      {selectedQuestion.author?.username || "chemist"}
                    </Text>
                    <Text
                      style={[
                        styles.detailDate,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {new Date(
                        selectedQuestion.created_at,
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Question Content */}
                  <View
                    style={[
                      styles.detailContentBox,
                      { backgroundColor: activeColors.backgroundElement },
                    ]}
                  >
                    <Text style={[styles.detailBody, { color: theme.text }]}>
                      {selectedQuestion.content}
                    </Text>
                  </View>

                  {/* Answers Section */}
                  <View style={styles.answersListHeader}>
                    <Text style={[styles.answersTitle, { color: theme.text }]}>
                      Reactions ({answers.length})
                    </Text>
                  </View>

                  {/* Answers list */}
                  {answers.length === 0 ? (
                    <View style={styles.emptyAnswers}>
                      <Text
                        style={[
                          styles.emptyAnswersText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        No answers yet. Be the first to explain!
                      </Text>
                    </View>
                  ) : (
                    answers
                      .sort((a, b) => b.upvotes_count - a.upvotes_count)
                      .map((a) => {
                        const answerAuthor = a.author;
                        const answerAuthorBadge = getUserBadge(
                          answerAuthor?.points || 0,
                        );
                        const isQuestionOwner =
                          user && selectedQuestion.author_id === user.id;

                        return (
                          <View
                            key={a.id}
                            style={[
                              styles.answerCard,
                              {
                                backgroundColor: activeColors.backgroundElement,
                                borderColor: a.is_accepted
                                  ? "#10B981"
                                  : activeColors.backgroundSelected,
                                borderWidth: a.is_accepted ? 1.5 : 1,
                              },
                            ]}
                          >
                            {/* Helpful Accepted Banner */}
                            {a.is_accepted && (
                              <View style={styles.acceptedBanner}>
                                <Text style={styles.acceptedBannerText}>
                                  ✓ Helpful Answer (+50 pts)
                                </Text>
                              </View>
                            )}

                            {/* Author info */}
                            <View style={styles.answerAuthorRow}>
                              <View style={styles.authorRow}>
                                <View
                                  style={[
                                    styles.avatarIndicator,
                                    {
                                      backgroundColor: answerAuthorBadge.color,
                                    },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.answerAuthorName,
                                    { color: theme.text },
                                  ]}
                                >
                                  u/{answerAuthor?.username || "chemist"}
                                </Text>
                                <Text
                                  style={[
                                    styles.badgeTextSmall,
                                    { color: answerAuthorBadge.color },
                                  ]}
                                >
                                  ({answerAuthorBadge.title})
                                </Text>
                              </View>

                              {/* Points count */}
                              <Text
                                style={[
                                  styles.authorPoints,
                                  { color: "#F59E0B" },
                                ]}
                              >
                                🧪 {answerAuthor?.points || 0} pts
                              </Text>
                            </View>

                            {/* Answer text */}
                            <Text
                              style={[styles.answerBody, { color: theme.text }]}
                            >
                              {a.content}
                            </Text>

                            {/* Votes / Accept Row */}
                            <View style={styles.answerCardFooter}>
                              <TouchableOpacity
                                style={[
                                  styles.upvoteBtn,
                                  {
                                    backgroundColor: a.has_upvoted
                                      ? "#10B981"
                                      : "#E0E1E6",
                                  },
                                ]}
                                onPress={() => handleToggleUpvote(a.id)}
                              >
                                <Text
                                  style={[
                                    styles.upvoteBtnLabel,
                                    { color: a.has_upvoted ? "#FFF" : "#333" },
                                  ]}
                                >
                                  ▲ Upvote ({a.upvotes_count})
                                </Text>
                              </TouchableOpacity>

                              {isQuestionOwner && (
                                <TouchableOpacity
                                  style={[
                                    styles.acceptBtn,
                                    {
                                      backgroundColor: a.is_accepted
                                        ? "#EF4444"
                                        : "#10B981",
                                    },
                                  ]}
                                  onPress={() => handleAcceptAnswer(a.id)}
                                >
                                  <Text style={styles.acceptBtnLabel}>
                                    {a.is_accepted
                                      ? "Unmark Help"
                                      : "✓ Mark Helpful"}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                  )}

                  {/* Add Answer Form */}
                  <View style={styles.addAnswerContainer}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Submit Solution
                    </Text>
                    <TextInput
                      style={[
                        styles.textAreaSmall,
                        {
                          color: theme.text,
                          backgroundColor: activeColors.backgroundElement,
                          borderColor: activeColors.backgroundSelected,
                        },
                      ]}
                      multiline
                      numberOfLines={4}
                      placeholder="Explain the chemistry behind this clearly..."
                      placeholderTextColor={theme.textSecondary}
                      value={newAnswerContent}
                      onChangeText={setNewAnswerContent}
                    />

                    <TouchableOpacity
                      style={[
                        styles.answerSubmitBtn,
                        { backgroundColor: submitting ? "#6B7280" : "#10B981" },
                      ]}
                      onPress={handlePostAnswer}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          Post Reaction 🧪
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Space for bottom */}
                  <View style={{ height: 50 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: "column",
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandSubtext: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginTop: -2,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
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
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterSection: {
    flexDirection: "column",
    gap: Spacing.one,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  groupTabs: {
    flexDirection: "row",
  },
  groupTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  groupTabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  askButton: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  askButtonText: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
  questionCard: {
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatarIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  groupTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  questionCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  questionSnippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  answersCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContainer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: "top",
    height: 120,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pickerItemText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  // Detail View styles
  detailHeaderTag: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailAuthorSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  detailAuthorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailDate: {
    fontSize: 12,
  },
  detailContentBox: {
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  detailBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  answersListHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.2)",
    paddingBottom: 8,
    marginBottom: Spacing.three,
  },
  answersTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyAnswers: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyAnswersText: {
    fontSize: 13,
  },
  answerCard: {
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
  },
  acceptedBanner: {
    backgroundColor: "#10B981",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  acceptedBannerText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },
  answerAuthorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  answerAuthorName: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextSmall: {
    fontSize: 11,
    fontWeight: "600",
  },
  authorPoints: {
    fontSize: 12,
    fontWeight: "600",
  },
  answerBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  answerCardFooter: {
    flexDirection: "row",
    gap: 12,
  },
  upvoteBtn: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  upvoteBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  acceptBtn: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  acceptBtnLabel: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  addAnswerContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    paddingTop: 12,
  },
  textAreaSmall: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: "top",
    height: 80,
  },
  answerSubmitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
