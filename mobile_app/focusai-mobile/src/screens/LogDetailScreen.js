import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const getRiskColor = (score) => {
  if (score < 25) return '#00D4AA';
  if (score < 50) return '#FFB347';
  if (score < 75) return '#FF6B6B';
  return '#FF2D55';
};

const getRiskLabel = (score) => {
  if (score < 25) return 'Low Risk';
  if (score < 50) return 'Moderate Risk';
  if (score < 75) return 'High Risk';
  return 'Critical Risk';
};

// Mini bar chart for a single metric
function MetricBar({ label, value, max, color, unit = '' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={D.metricRow}>
      <View style={D.metricLeft}>
        <Text style={D.metricLabel}>{label}</Text>
        <Text style={[D.metricValue, { color }]}>{value}{unit}</Text>
      </View>
      <View style={D.barTrack}>
        <View style={[D.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={D.metricMax}>{max}{unit}</Text>
    </View>
  );
}

// Score ring
function ScoreRing({ score, label, color, size = 80 }) {
  const radius   = (size - 12) / 2;
  const circum   = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[D.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color + '33' }]}>
        <View style={[D.ringFill, {
          width: size - 8, height: size - 8, borderRadius: (size - 8) / 2,
          borderColor: color, borderWidth: 4,
          // Simulate progress with border trick
          opacity: 0.15 + progress * 0.85,
        }]} />
        <Text style={[D.ringScore, { color, fontSize: size * 0.25 }]}>{Math.round(score)}</Text>
        <Text style={D.ringLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function LogDetailScreen({ navigation, route }) {
  const { log } = route.params || {};
  if (!log) return null;

  const risk         = parseFloat(log.addiction_risk_score) || 0;
  const focus        = parseFloat(log.focus_score)          || 0;
  const productivity = parseFloat(log.productivity_score_ai)|| 0;
  const riskColor    = getRiskColor(risk);
  const riskLabel    = getRiskLabel(risk);

  const dayName = new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <View style={D.root}>
      {/* ── Top Bar ── */}
      <View style={D.topBar}>
        <TouchableOpacity style={D.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={D.topCenter}>
          <Text style={D.topTitle}>{log.log_date}</Text>
          <Text style={D.topSub}>{new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={D.scroll} contentContainerStyle={D.content} showsVerticalScrollIndicator={false}>

        {/* ── Risk Banner ── */}
        <LinearGradient
          colors={[riskColor + '33', riskColor + '11']}
          style={[D.riskBanner, { borderColor: riskColor + '55' }]}
        >
          <View style={[D.riskDot, { backgroundColor: riskColor }]} />
          <View>
            <Text style={D.riskLabel}>{riskLabel}</Text>
            <Text style={D.riskSub}>{dayName}</Text>
          </View>
          <Text style={[D.riskScore, { color: riskColor }]}>{risk.toFixed(1)}</Text>
        </LinearGradient>

        {/* ── AI Scores ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>🧠 AI Scores</Text>
          <View style={D.scoresRow}>
            <ScoreRing score={risk}         label="Risk"   color={colors.riskColor}          size={90} />
            <ScoreRing score={focus}        label="Focus"  color={colors.focusColor}         size={90} />
            <ScoreRing score={productivity} label="Prod."  color={colors.productivityColor}  size={90} />
          </View>
        </View>

        {/* ── Screen Time Breakdown ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>📱 Screen Time</Text>
          <MetricBar label="Total Screen"  value={log.screen_time_hours}  max={16} color={colors.riskColor}   unit="h" />
          <MetricBar label="Social Media"  value={log.social_media_hours} max={8}  color={colors.high}        unit="h" />
          <MetricBar label="Gaming"        value={log.gaming_hours}       max={8}  color={colors.moderate}    unit="h" />
        </View>

        {/* ── Productivity ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>📚 Productivity</Text>
          <MetricBar label="Study / Work"  value={log.study_hours}            max={12}  color={colors.focusColor} unit="h" />
          <MetricBar label="Notifications" value={log.notifications_checked}  max={200} color={colors.moderate}   unit="" />
        </View>

        {/* ── Wellbeing ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>🌙 Wellbeing</Text>
          <MetricBar label="Sleep"         value={log.sleep_hours}          max={12}  color={colors.productivityColor} unit="h" />
          <MetricBar label="Outside Time"  value={log.outside_time_minutes} max={180} color={colors.success}           unit=" min" />
        </View>

        {/* ── Mood & Energy ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>😊 Mood & Energy</Text>
          <MetricBar label="Mood Score"       value={log.mood_score}         max={10} color={colors.gradientStart} unit="/10" />
          <MetricBar label="Productivity Self" value={log.productivity_score} max={10} color={colors.gradientEnd}   unit="/10" />
        </View>

        {/* ── Raw Data ── */}
        <View style={D.card}>
          <Text style={D.cardTitle}>📋 Full Data</Text>
          {[
            ['Screen Time',    `${log.screen_time_hours}h`],
            ['Social Media',   `${log.social_media_hours}h`],
            ['Gaming',         `${log.gaming_hours}h`],
            ['Study / Work',   `${log.study_hours}h`],
            ['Sleep',          `${log.sleep_hours}h`],
            ['Mood',           `${log.mood_score}/10`],
            ['Notifications',  log.notifications_checked],
            ['Outside Time',   `${log.outside_time_minutes} min`],
            ['Risk Score',     risk.toFixed(2)],
            ['Focus Score',    focus.toFixed(2)],
            ['Productivity',   productivity.toFixed(2)],
          ].map(([label, value], i) => (
            <View key={i} style={[D.row, i % 2 === 0 && D.rowAlt]}>
              <Text style={D.rowLabel}>{label}</Text>
              <Text style={D.rowValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const D = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  scroll:     { flex: 1 },
  content:    { padding: 16 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  topCenter:  { flex: 1, alignItems: 'center' },
  topTitle:   { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  topSub:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  riskBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  riskDot:    { width: 14, height: 14, borderRadius: 7 },
  riskLabel:  { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  riskSub:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  riskScore:  { fontSize: 28, fontWeight: '900', marginLeft: 'auto' },

  card:       { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },

  scoresRow:  { flexDirection: 'row', justifyContent: 'space-around' },
  ring: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, position: 'relative',
  },
  ringFill:   { position: 'absolute', borderStyle: 'solid' },
  ringScore:  { fontWeight: '800', position: 'absolute' },
  ringLabel:  { fontSize: 10, color: colors.textMuted, position: 'absolute', bottom: 10 },

  metricRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  metricLeft: { width: 110 },
  metricLabel:{ fontSize: 12, color: colors.textSecondary },
  metricValue:{ fontSize: 13, fontWeight: '700', marginTop: 2 },
  barTrack:   { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 3 },
  metricMax:  { fontSize: 10, color: colors.textMuted, width: 30, textAlign: 'right' },

  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowAlt:     { backgroundColor: colors.cardBorder + '33', borderRadius: 6, paddingHorizontal: 6 },
  rowLabel:   { fontSize: 13, color: colors.textSecondary },
  rowValue:   { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
});