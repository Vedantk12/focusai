import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import ScoreGauge from '../components/ScoreGauge';
import RiskBadge from '../components/RiskBadge';
import { getStoredUser, getLatestScores, getStreak, getBurnoutPrediction } from '../services/api';

// ── Streak Badge Component ─────────────────────────────
function StreakBadge({ streak }) {
  if (!streak || streak.streak_days < 2) {
    return (
      <View style={sb.noStreakCard}>
        <Text style={sb.noStreakEmoji}>🎯</Text>
        <View style={sb.noStreakText}>
          <Text style={sb.noStreakTitle}>Start Your Streak!</Text>
          <Text style={sb.noStreakSub}>
            {streak?.message || 'Log 2 days in a row to earn a badge'}
          </Text>
        </View>
      </View>
    );
  }

  const isGold   = streak.badge === 'gold';
  const progress = Math.min(streak.promotion_progress / streak.promotion_target, 1);

  return (
    <View style={sb.card}>
      {/* Badge Icon + Days */}
      <View style={sb.left}>
        <View style={[sb.badgeCircle, { backgroundColor: isGold ? '#FFD700' : '#C0C0C0' }]}>
          <Text style={sb.badgeEmoji}>{isGold ? '🥇' : '🥈'}</Text>
          <Text style={sb.badgeDays}>{streak.streak_days}</Text>
        </View>
        <Text style={[sb.badgeLabel, { color: isGold ? '#FFD700' : '#C0C0C0' }]}>
          {streak.badge_label}
        </Text>
      </View>

      {/* Info + Progress */}
      <View style={sb.right}>
        <Text style={sb.streakTitle}>
          🔥 {streak.streak_days} Day Streak
        </Text>
        <Text style={sb.streakMsg}>{streak.message}</Text>

        {/* Progress bar — silver to gold */}
        {!isGold && (
          <>
            <View style={sb.progressTrack}>
              <LinearGradient
                colors={['#C0C0C0', '#FFD700']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[sb.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={sb.progressLabel}>
              {streak.promotion_progress}/{streak.promotion_target} low-risk days → 🥇 Gold
            </Text>
          </>
        )}

        {isGold && (
          <Text style={sb.goldMsg}>✨ All low risk — keep going!</Text>
        )}
      </View>
    </View>
  );
}

// ── Burnout Banner Component ───────────────────────────
function BurnoutBanner({ burnout }) {
  if (!burnout || burnout.level === 'none' || burnout.status === 'insufficient_data') return null;

  const configs = {
    critical: { bg: '#FF2D5522', border: '#FF2D55', icon: '🚨', textColor: '#FF2D55' },
    warning:  { bg: '#FF6B6B22', border: '#FF6B6B', icon: '⚠️', textColor: '#FF6B6B' },
    caution:  { bg: '#FFB34722', border: '#FFB347', icon: '🟡', textColor: '#FFB347' },
    good:     { bg: '#00D4AA22', border: '#00D4AA', icon: '✅', textColor: '#00D4AA' },
    stable:   { bg: '#6C63FF22', border: '#6C63FF', icon: '📊', textColor: '#6C63FF' },
  };

  const cfg = configs[burnout.level] || configs.stable;

  return (
    <View style={[bb.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      {/* Header */}
      <View style={bb.header}>
        <Text style={bb.icon}>{cfg.icon}</Text>
        <View style={bb.headerText}>
          <Text style={[bb.title, { color: cfg.textColor }]}>{burnout.title}</Text>
          <Text style={bb.message}>{burnout.message}</Text>
        </View>
      </View>

      {/* Trend dots */}
      {burnout.trend?.length > 0 && (
        <View style={bb.trendRow}>
          {burnout.trend.map((t, i) => {
            const dotColor = t.risk < 25 ? '#00D4AA' : t.risk < 50 ? '#FFB347' : t.risk < 75 ? '#FF6B6B' : '#FF2D55';
            return (
              <View key={i} style={bb.trendItem}>
                <View style={[bb.trendDot, { backgroundColor: dotColor }]} />
                <Text style={bb.trendVal}>{t.risk}</Text>
                <Text style={bb.trendDate}>{t.date}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Advice */}
      {burnout.advice?.length > 0 && (
        <View style={bb.adviceBox}>
          <Text style={[bb.adviceTitle, { color: cfg.textColor }]}>💡 What to do:</Text>
          {burnout.advice.slice(0, 3).map((tip, i) => (
            <Text key={i} style={bb.adviceTip}>• {tip}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const bb = StyleSheet.create({
  card:        { borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1.5 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  icon:        { fontSize: 28, marginTop: 2 },
  headerText:  { flex: 1 },
  title:       { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  message:     { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  trendRow:    { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 10, backgroundColor: colors.card + '88', borderRadius: 12 },
  trendItem:   { alignItems: 'center', gap: 4 },
  trendDot:    { width: 10, height: 10, borderRadius: 5 },
  trendVal:    { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  trendDate:   { fontSize: 9, color: colors.textMuted },

  adviceBox:   { backgroundColor: colors.card + '88', borderRadius: 12, padding: 12 },
  adviceTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  adviceTip:   { fontSize: 12, color: colors.textSecondary, lineHeight: 20 },
});

// ── Main Screen ────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const [user,       setUser]       = useState(null);
  const [scores,     setScores]     = useState(null);
  const [streak,     setStreak]     = useState(null);
  const [burnout,    setBurnout]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const storedUser = await getStoredUser();
      setUser(storedUser);
      if (storedUser?.user_id) {
        const [scoreData, streakData, burnoutData] = await Promise.allSettled([
          getLatestScores(storedUser.user_id),
          getStreak(),
          getBurnoutPrediction(),
        ]);
        if (scoreData.status   === 'fulfilled') setScores(scoreData.value);
        if (streakData.status  === 'fulfilled') setStreak(streakData.value);
        if (burnoutData.status === 'fulfilled') setBurnout(burnoutData.value);
      }
    } catch (e) {
      setScores(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
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
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'User'} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => navigation.navigate('Calendar', {
            screen: 'Log',
            params: { preselectedDate: new Date().toISOString().slice(0, 10) }
          })}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.logButtonGradient}
          >
            <Text style={styles.logButtonText}>+ Log Today</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Burnout Banner ── */}
      <BurnoutBanner burnout={burnout} />

      {/* ── Streak Badge ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Streak</Text>
      </View>
      <StreakBadge streak={streak} />

      {scores ? (
        <>
          {/* ── Risk Banner ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Risk</Text>
          </View>
          <View style={styles.riskBanner}>
            <View style={styles.riskBannerContent}>
              <View>
                <Text style={styles.riskBannerLabel}>CURRENT RISK LEVEL</Text>
                <RiskBadge category={scores.risk_category} large />
              </View>
              <Text style={styles.riskBannerDate}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>

          {/* ── Score Gauges ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Scores</Text>
          </View>
          <View style={styles.gaugesCard}>
            <ScoreGauge score={scores.addiction_risk_score}  label="Risk"         color={colors.riskColor}          size={110} />
            <View style={styles.gaugeDivider} />
            <ScoreGauge score={scores.focus_score}           label="Focus"         color={colors.focusColor}         size={110} />
            <View style={styles.gaugeDivider} />
            <ScoreGauge score={scores.productivity_score_ai} label="Productivity"  color={colors.productivityColor}  size={110} />
          </View>

          {/* ── Quick Stats ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Insight</Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { label: 'Risk Score',   value: `${scores.addiction_risk_score}`,   unit: '/100', color: colors.riskColor },
              { label: 'Focus Score',  value: `${scores.focus_score}`,            unit: '/100', color: colors.focusColor },
              { label: 'Productivity', value: `${scores.productivity_score_ai}`,  unit: '/100', color: colors.productivityColor },
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statUnit}>{stat.unit}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statDate}>
                  {new Date(scores.log_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySubtitle}>
            Log your first day to see your AI-generated health scores and recommendations.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Calendar', {
              screen: 'Log',
              params: { preselectedDate: new Date().toISOString().slice(0, 10) }
            })}
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

// ── Streak Badge Styles ────────────────────────────────
const sb = StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: colors.card,
    borderRadius:    20,
    padding:         16,
    marginBottom:    24,
    borderWidth:     1,
    borderColor:     colors.cardBorder,
    alignItems:      'center',
    gap:             16,
  },
  left:         { alignItems: 'center', minWidth: 72 },
  badgeCircle:  {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  badgeEmoji:   { fontSize: 28 },
  badgeDays:    { fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginTop: -4 },
  badgeLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  right:        { flex: 1 },
  streakTitle:  { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  streakMsg:    { fontSize: 12, color: colors.textSecondary, marginBottom: 8, lineHeight: 17 },

  progressTrack: {
    height: 6, backgroundColor: colors.cardBorder,
    borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: colors.textMuted },
  goldMsg:       { fontSize: 12, color: '#FFD700', fontWeight: '600' },

  noStreakCard: {
    flexDirection:   'row',
    backgroundColor: colors.card,
    borderRadius:    20,
    padding:         16,
    marginBottom:    24,
    borderWidth:     1,
    borderColor:     colors.cardBorder,
    alignItems:      'center',
    gap:             12,
  },
  noStreakEmoji: { fontSize: 36 },
  noStreakText:  { flex: 1 },
  noStreakTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  noStreakSub:   { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
});

// ── Main Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background },
  content:             { padding: 20, paddingBottom: 40 },
  loadingContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 12 },
  greeting:            { fontSize: 14, color: colors.textSecondary },
  userName:            { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  logButton:           { borderRadius: 12, overflow: 'hidden' },
  logButtonGradient:   { paddingHorizontal: 16, paddingVertical: 10 },
  logButtonText:       { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionHeader:       { marginBottom: 12 },
  sectionTitle:        { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  riskBanner:          { borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  riskBannerContent:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskBannerLabel:     { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  riskBannerDate:      { fontSize: 13, color: colors.textMuted },

  gaugesCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 8,
    marginBottom: 24, borderWidth: 1, borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  
  gaugeDivider:        { width: 1, height: 80, backgroundColor: colors.cardBorder },

  statsRow:            { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard:            {
    flex: 1, backgroundColor: colors.card, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder,
  },
  statValue:           { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  statUnit:            { fontSize: 11, color: colors.textMuted, marginTop: -2 },
  statLabel:           { fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  statDate:            { fontSize: 10, color: colors.textMuted, marginTop: 3, textAlign: 'center' },

  emptyState:          { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyEmoji:          { fontSize: 64, marginBottom: 24 },
  emptyTitle:          { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  emptySubtitle:       { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  emptyButton:         { borderRadius: 14, overflow: 'hidden', width: '100%' },
  emptyButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  emptyButtonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});