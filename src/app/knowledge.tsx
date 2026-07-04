import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

interface KnowledgeItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  pdf_url: string;
  created_at: string;
}

const categories = [
  'All',
  'Textbook',
  'Organic Chemistry',
  'Inorganic Chemistry',
  'Physical Chemistry',
  'High School & Intro',
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Textbook':
      return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' };
    case 'Organic Chemistry':
      return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' };
    case 'Inorganic Chemistry':
      return { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' };
    case 'Physical Chemistry':
      return { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' };
    case 'High School & Intro':
    default:
      return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' };
  }
};

export default function KnowledgeBaseScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const activeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [resources, setResources] = useState<KnowledgeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeBase();
      setResources(data as KnowledgeItem[]);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleOpenPDF = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening browser, falling back to Linking:', error);
      Linking.openURL(url);
    }
  };

  const filteredResources = selectedCategory === 'All'
    ? resources
    : resources.filter(r => r.category === selectedCategory);

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
      <View style={[styles.header, { borderBottomColor: activeColors.backgroundElement }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Knowledge Base 📚</Text>
        <Text style={styles.headerSub}>Curated Chemistry Notes & Texts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Distilling study materials...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}>
          <View style={styles.wrapper}>
            <View style={[styles.introBox, { backgroundColor: activeColors.backgroundElement }]}>
              <Text style={[styles.introTitle, { color: theme.text }]}>Study Smart, React Correctly ⚛️</Text>
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                Access open-source college textbooks and peer-reviewed chemistry lecture notes. Click any file to view online or download as PDF.
              </Text>
            </View>

            <View style={styles.categoryContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryTab,
                      {
                        backgroundColor:
                          selectedCategory === cat
                            ? '#10B981'
                            : activeColors.backgroundElement,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: selectedCategory === cat ? '#FFF' : theme.text },
                      ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.listContainer}>
              {filteredResources.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No study material found in this category.
                  </Text>
                </View>
              ) : (
                filteredResources.map(res => {
                  const colors = getCategoryColor(res.category);
                  return (
                    <View
                      key={res.id}
                      style={[
                        styles.resourceCard,
                        {
                          backgroundColor: activeColors.backgroundElement,
                          borderColor: activeColors.backgroundSelected,
                        },
                      ]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                            {res.category}
                          </Text>
                        </View>
                        <Text style={styles.pdfIcon}>📄 PDF</Text>
                      </View>

                      <Text style={[styles.resourceTitle, { color: theme.text }]}>
                        {res.title}
                      </Text>
                      <Text style={[styles.resourceDesc, { color: theme.textSecondary }]}>
                        {res.description}
                      </Text>

                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleOpenPDF(res.pdf_url)}>
                        <Text style={styles.downloadBtnText}>Download / Open PDF 📥</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
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
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
  introBox: {
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  introText: {
    fontSize: 12,
    lineHeight: 18,
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    flexDirection: 'column',
    gap: Spacing.three,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  resourceCard: {
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pdfIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  resourceDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  downloadBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  downloadBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
});
