import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import ScoreGauge from '../components/ScoreGauge';
import RiskBadge from '../components/RiskBadge';
import RecommendationCard from '../components/RecommendationCard';
import { getStoredUser, getLatestScores } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [user, setUser]           = useState(null);
  const [scores, setScores]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const storedUser = await getStoredUser();
      setUser(storedUser);
      if (storedUser.user_id) {
        const data = await getLatestScores(storedUser.user_id);
        setScores(data);
      }
    } catch (e) {
      // No scores yet — user hasn't submitted a log
      setScores(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time this screen is focused
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'User'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logButton} onPress={() => navigation.navigate('Calendar', { screen: 'Log', params: { preselectedDate: new Date().toISOString().slice(0, 10) } })}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.logButtonGradient}
          >
            <Text style={styles.logButtonText}>+ Log Today</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {scores ? (
        <>
          {/* Risk Banner */}
          <LinearGradient
            colors={[colors.card, colors.card]}
            style={styles.riskBanner}
          >
            <View style={styles.riskBannerContent}>
              <View>
                <Text style={styles.riskBannerLabel}>TODAY'S RISK LEVEL</Text>
                <RiskBadge category={scores.risk_category} large />
              </View>
              <Text style={styles.riskBannerDate}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </LinearGradient>

          {/* Score Gauges */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Scores</Text>
          </View>

          <View style={styles.gaugesCard}>
            <ScoreGauge
              score={scores.addiction_risk_score}
              label="Risk"
              color={colors.riskColor}
              size={110}
            />
            <View style={styles.gaugeDivider} />
            <ScoreGauge
              score={scores.focus_score}
              label="Focus"
              color={colors.focusColor}
              size={110}
            />
            <View style={styles.gaugeDivider} />
            <ScoreGauge
              score={scores.productivity_score_ai}
              label="Productivity"
              color={colors.productivityColor}
              size={110}
            />
          </View>

          {/* Quick Stats */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Insight</Text>
          </View>

          <View style={styles.statsRow}>
            {[
              { label: 'Risk Score',    value: `${scores.addiction_risk_score}`,    unit: '/100', color: colors.riskColor },
              { label: 'Focus Score',   value: `${scores.focus_score}`,             unit: '/100', color: colors.focusColor },
              { label: 'Productivity',  value: `${scores.productivity_score_ai}`,   unit: '/100', color: colors.productivityColor },
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statUnit}>{stat.unit}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations section removed — shown on separate tab */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tips</Text>
          </View>
          <Text style={styles.tipsHint}>Based on your latest log</Text>

        </>
      ) : (
        /* Empty state — no logs yet */
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>
            Log your first day to see your AI-generated health scores and recommendations.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Calendar', { screen: 'Log', params: { preselectedDate: new Date().toISOString().slice(0, 10) } })}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Log My First Day</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 12 },
  greeting:         { fontSize: 14, color: colors.textSecondary },
  userName:         { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  logButton:        { borderRadius: 12, overflow: 'hidden' },
  logButtonGradient:{ paddingHorizontal: 16, paddingVertical: 10 },
  logButtonText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  riskBanner:       { borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.cardBorder },
  riskBannerContent:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskBannerLabel:  { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  riskBannerDate:   { fontSize: 13, color: colors.textMuted },
  sectionHeader:    { marginBottom: 12 },
  sectionTitle:     { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  gaugesCard:       {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 20, padding: 24,
    marginBottom: 24, borderWidth: 1, borderColor: colors.cardBorder,
  },
  gaugeDivider:     { width: 1, height: 80, backgroundColor: colors.cardBorder },
  statsRow:         { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard:         {
    flex: 1, backgroundColor: colors.card, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder,
  },
  statValue:        { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  statUnit:         { fontSize: 11, color: colors.textMuted, marginTop: -2 },
  statLabel:        { fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  tipsHint:         { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  emptyState:       { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyEmoji:       { fontSize: 64, marginBottom: 24 },
  emptyTitle:       { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  emptySubtitle:    { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  emptyButton:      { borderRadius: 14, overflow: 'hidden', width: '100%' },
  emptyButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  emptyButtonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
