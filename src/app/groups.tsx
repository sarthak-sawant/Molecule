import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

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

export default function GroupsScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const activeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();

  // Global States
  const [groups, setGroups] = useState<Group[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Content Forms
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newAnswerContent, setNewAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, questionsData] = await Promise.all([
        api.getGroups(),
        api.getQuestions(),
      ]);
      setGroups(groupsData as Group[]);
      setQuestions(questionsData as Question[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch answers for selected question
  const fetchAnswers = async (questionId: string) => {
    try {
      const answersData = await api.getAnswers(questionId);
      setAnswers(answersData as Answer[]);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create Group
  const handleCreateGroup = async () => {
    const nameClean = newGroupName.replace(/\s+/g, '').trim();
    if (nameClean.length < 3) {
      Alert.alert('Invalid Name', 'Group name must be at least 3 characters (letters/numbers only).');
      return;
    }
    if (!newGroupDescription.trim()) {
      Alert.alert('Missing Description', 'Please provide a brief description of what this group covers.');
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in to create groups.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createGroup(nameClean, newGroupDescription);
      await fetchData();
      Alert.alert('Sub-Molecule Created', `r/${nameClean} has been successfully synthesized!`);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
    } catch (err: any) {
      Alert.alert('Synthesis Failed', err.message || 'Error creating group.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Question inside a Group
  const handleAskQuestion = async () => {
    if (!selectedGroup) return;
    if (!newQuestionTitle.trim() || !newQuestionContent.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in the title and description.');
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in to post questions.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createQuestion(newQuestionTitle, newQuestionContent, selectedGroup.id);
      await fetchData();
      Alert.alert('Success', 'Question posted in group!');
      setNewQuestionTitle('');
      setNewQuestionContent('');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Answer
  const handlePostAnswer = async () => {
    if (!selectedQuestion) return;
    if (!newAnswerContent.trim()) {
      Alert.alert('Empty Answer', 'Please enter your answer.');
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in to post answers.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createAnswer(selectedQuestion.id, newAnswerContent);
      await fetchAnswers(selectedQuestion.id);
      setNewAnswerContent('');
      Alert.alert('Success', 'Answer posted!');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upvote Answer
  const handleToggleUpvote = async (answerId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to upvote answers.');
      return;
    }

    try {
      const targetAnswer = answers.find(a => a.id === answerId);
      if (!targetAnswer) return;

      if (targetAnswer.has_upvoted) {
        await api.removeUpvote(answerId);
      } else {
        await api.upvoteAnswer(answerId);
      }
      await fetchAnswers(selectedQuestion?.id || answerId);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter groups by search
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter questions for the selected group details view
  const groupQuestions = selectedGroup
    ? questions.filter(q => q.group_id === selectedGroup.id)
    : [];

  const contentPlatformStyle = Platform.select({
    android: {
      paddingBottom: BottomTabInset + Spacing.four,
    },
    web: {
      paddingBottom: Spacing.four,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: activeColors.backgroundElement }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Sub-Molecules ⌬</Text>
          <Text style={styles.headerSub}>Chemistry Communities</Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            if (!user) {
              Alert.alert('Login Required', 'Please log in to create groups.');
            } else {
              setIsCreatingGroup(true);
            }
          }}>
          <Text style={styles.createBtnText}>+ Create Group</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Scanning Communities...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}>
          <View style={styles.wrapper}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchSection,
                {
                  backgroundColor: activeColors.backgroundElement,
                  borderColor: activeColors.backgroundSelected,
                },
              ]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search sub-molecule groups (e.g. Organic)..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* List of Groups */}
            <View style={styles.groupsGrid}>
              {filteredGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No communities found</Text>
                </View>
              ) : (
                filteredGroups.map(g => {
                  const qCount = questions.filter(q => q.group_id === g.id).length;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupCard,
                        {
                          backgroundColor: activeColors.backgroundElement,
                          borderColor: activeColors.backgroundSelected,
                        },
                      ]}
                      onPress={() => setSelectedGroup(g)}>
                      <Text style={[styles.groupName, { color: theme.text }]}>r/{g.name}</Text>
                      <Text
                        style={[styles.groupDesc, { color: theme.textSecondary }]}
                        numberOfLines={2}>
                        {g.description}
                      </Text>
                      <View style={styles.groupFooter}>
                        <Text style={styles.membersText}>⌬ {qCount} Questions</Text>
                        <Text style={styles.viewText}>View Feed →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODAL: CREATE GROUP */}
      <Modal
        visible={isCreatingGroup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreatingGroup(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background, borderColor: activeColors.backgroundSelected },
            ]}>
            <View style={[styles.modalHeader, { borderBottomColor: activeColors.backgroundElement }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Synthesize Sub-Molecule</Text>
              <TouchableOpacity onPress={() => setIsCreatingGroup(false)}>
                <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: Spacing.three }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Sub-Molecule Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: activeColors.backgroundElement,
                    borderColor: activeColors.backgroundSelected,
                  },
                ]}
                placeholder="e.g. PhysicalThermodynamics (no spaces)"
                placeholderTextColor={theme.textSecondary}
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Topic Description</Text>
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
                numberOfLines={4}
                placeholder="What chemistry topics will students discuss here?"
                placeholderTextColor={theme.textSecondary}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: submitting ? '#6B7280' : '#10B981' }]}
                onPress={handleCreateGroup}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Initialize Community ⌬</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: GROUP DETAILS & SPECIFIC QUESTIONS */}
      <Modal
        visible={selectedGroup !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedGroup(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background, borderColor: activeColors.backgroundSelected },
            ]}>
            {selectedGroup && (
              <>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: activeColors.backgroundElement },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                      r/{selectedGroup.name}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: theme.textSecondary }}
                      numberOfLines={1}>
                      {selectedGroup.description}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                    <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: Spacing.three }}>
                  {/* Ask Question in this Group */}
                  <View
                    style={[
                      styles.askQuestionBox,
                      { backgroundColor: activeColors.backgroundElement },
                    ]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Ask inside r/{selectedGroup.name}
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.background,
                          borderColor: activeColors.backgroundSelected,
                          marginBottom: 8,
                        },
                      ]}
                      placeholder="Title / Chemistry Equation..."
                      placeholderTextColor={theme.textSecondary}
                      value={newQuestionTitle}
                      onChangeText={setNewQuestionTitle}
                    />
                    <TextInput
                      style={[
                        styles.textAreaSmall,
                        {
                          color: theme.text,
                          backgroundColor: theme.background,
                          borderColor: activeColors.backgroundSelected,
                          marginBottom: 12,
                        },
                      ]}
                      multiline
                      numberOfLines={3}
                      placeholder="Details, structures, reactions..."
                      placeholderTextColor={theme.textSecondary}
                      value={newQuestionContent}
                      onChangeText={setNewQuestionContent}
                    />
                    <TouchableOpacity
                      style={styles.inlineAskBtn}
                      onPress={handleAskQuestion}
                      disabled={submitting}>
                      <Text style={styles.inlineAskBtnText}>Post Question ⚛️</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Group Questions List */}
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
                    Questions Feed
                  </Text>

                  {groupQuestions.length === 0 ? (
                    <View style={styles.emptyGroupQuestions}>
                      <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                        No questions in this sub-molecule yet. Be the first to ask!
                      </Text>
                    </View>
                  ) : (
                    groupQuestions.map(q => (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.questionCard,
                          {
                            backgroundColor: activeColors.backgroundElement,
                            borderColor: activeColors.backgroundSelected,
                            marginBottom: Spacing.two,
                          },
                        ]}
                        onPress={async () => {
                          setSelectedQuestion(q);
                          await fetchAnswers(q.id);
                        }}>
                        <Text style={[styles.questionCardTitle, { color: theme.text }]}>
                          {q.title}
                        </Text>
                        <Text
                          style={[styles.questionSnippet, { color: theme.textSecondary }]}
                          numberOfLines={2}>
                          {q.content}
                        </Text>
                        <View style={styles.cardFooter}>
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                            💬 {q.answers_count || 0} answers
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                            {new Date(q.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}

                  <View style={{ height: 60 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QUESTION DETAIL & ANSWERS */}
      <Modal
        visible={selectedQuestion !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedQuestion(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background, borderColor: activeColors.backgroundSelected },
            ]}>
            {selectedQuestion && (
              <>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: activeColors.backgroundElement },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>
                      r/{selectedQuestion.group_name || 'General'}
                    </Text>
                    <Text
                      style={[styles.modalTitle, { color: theme.text, fontSize: 16 }]}
                      numberOfLines={1}>
                      {selectedQuestion.title}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedQuestion(null)}>
                    <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: Spacing.three }}>
                  <View style={styles.detailAuthorSection}>
                    <Text style={[styles.detailAuthorName, { color: theme.text }]}>
                      Asked by u/{selectedQuestion.author?.username || 'chemist'}
                    </Text>
                    <Text style={[styles.detailDate, { color: theme.textSecondary }]}>
                      {new Date(selectedQuestion.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailContentBox,
                      { backgroundColor: activeColors.backgroundElement },
                    ]}>
                    <Text style={[styles.detailBody, { color: theme.text }]}>
                      {selectedQuestion.content}
                    </Text>
                  </View>

                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
                    Reactions ({answers.length})
                  </Text>

                  {answers.length === 0 ? (
                    <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                      No answers yet.
                    </Text>
                  ) : (
                    answers
                      .sort((a, b) => b.upvotes_count - a.upvotes_count)
                      .map(a => (
                        <View
                          key={a.id}
                          style={[
                            styles.answerCard,
                            {
                              backgroundColor: activeColors.backgroundElement,
                              borderColor: a.is_accepted ? '#10B981' : activeColors.backgroundSelected,
                              borderWidth: a.is_accepted ? 1.5 : 1,
                            },
                          ]}>
                          {a.is_accepted && (
                            <View style={styles.acceptedBanner}>
                              <Text style={styles.acceptedBannerText}>✓ Helpful Answer</Text>
                            </View>
                          )}
                          <View style={styles.answerAuthorRow}>
                            <Text style={[styles.answerAuthorName, { color: theme.text }]}>
                              u/{a.author?.username || 'chemist'}
                            </Text>
                            <Text style={{ color: '#F59E0B', fontSize: 12 }}>
                              🧪 {a.author?.points || 0} pts
                            </Text>
                          </View>
                          <Text style={[styles.answerBody, { color: theme.text }]}>
                            {a.content}
                          </Text>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                              style={[
                                styles.upvoteBtn,
                                { backgroundColor: a.has_upvoted ? '#10B981' : '#E0E1E6' },
                              ]}
                              onPress={() => handleToggleUpvote(a.id)}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: a.has_upvoted ? '#FFF' : '#333',
                                }}>
                                ▲ Upvote ({a.upvotes_count})
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                  )}

                  <View style={styles.addAnswerContainer}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Submit Solution</Text>
                    <TextInput
                      style={[
                        styles.textAreaSmall,
                        {
                          color: theme.text,
                          backgroundColor: activeColors.backgroundElement,
                          borderColor: activeColors.backgroundSelected,
                          marginBottom: 8,
                        },
                      ]}
                      multiline
                      numberOfLines={3}
                      placeholder="Write your reaction..."
                      placeholderTextColor={theme.textSecondary}
                      value={newAnswerContent}
                      onChangeText={setNewAnswerContent}
                    />
                    <TouchableOpacity style={styles.inlineAskBtn} onPress={handlePostAnswer}>
                      <Text style={styles.inlineAskBtnText}>Post Answer 🧪</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 60 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
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
  groupsGrid: {
    flexDirection: 'column',
    gap: Spacing.three,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  groupCard: {
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    gap: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '800',
  },
  groupDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  membersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  viewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
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
    textAlignVertical: 'top',
    height: 100,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  askQuestionBox: {
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  textAreaSmall: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    fontSize: 13,
    textAlignVertical: 'top',
    height: 60,
  },
  inlineAskBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inlineAskBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyGroupQuestions: {
    paddingVertical: 30,
  },
  questionCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
  },
  questionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  questionSnippet: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailAuthorSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailAuthorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailDate: {
    fontSize: 11,
  },
  detailContentBox: {
    borderRadius: 10,
    padding: Spacing.three,
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  answerCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  acceptedBanner: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  acceptedBannerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  answerAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  answerAuthorName: {
    fontSize: 12,
    fontWeight: '700',
  },
  answerBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  upvoteBtn: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addAnswerContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 12,
  },
});
