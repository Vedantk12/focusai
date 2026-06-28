import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import RiskBadge from '../components/RiskBadge';

const getRiskCategory = (score) => {
  if (score < 25) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 75) return 'High';
  return 'Critical';
};

const getRiskColor = (score) => {
  if (score < 25) return '#00D4AA';
  if (score < 50) return '#FFB347';
  if (score < 75) return '#FF6B6B';
  return '#FF2D55';
};

export default function AllLogsScreen({ navigation, route }) {
  const { logs = [] } = route.params || {};

  return (
    <View style={S.root}>
      {/* ── Top Bar ── */}
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={S.topCenter}>
          <Text style={S.topTitle}>All Logs</Text>
          <Text style={S.topSub}>{logs.length} entries total</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        {logs.map((log, index) => {
          const risk = parseFloat(log.addiction_risk_score) || 0;
          const riskColor = getRiskColor(risk);

          return (
            <TouchableOpacity
              key={index}
              style={S.logCard}
              onPress={() => navigation.navigate('LogDetail', { log })}
              activeOpacity={0.75}
            >
              {/* Left color bar */}
              <View style={[S.colorBar, { backgroundColor: riskColor }]} />

              <View style={S.cardContent}>
                <View style={S.logHeader}>
                  <View>
                    <Text style={S.logDate}>{log.log_date}</Text>
                    <Text style={S.logDay}>
                      {new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
                    </Text>
                  </View>
                  <RiskBadge category={getRiskCategory(risk)} />
                </View>

                <View style={S.statsRow}>
                  {[
                    { label: 'Risk',   value: risk.toFixed(1),                              color: colors.riskColor },
                    { label: 'Focus',  value: parseFloat(log.focus_score).toFixed(1),       color: colors.focusColor },
                    { label: 'Screen', value: `${log.screen_time_hours}h`,                  color: colors.textSecondary },
                    { label: 'Sleep',  value: `${log.sleep_hours}h`,                        color: colors.productivityColor },
                    { label: 'Mood',   value: `${log.mood_score}/10`,                       color: colors.gradientStart },
                  ].map((stat, i) => (
                    <View key={i} style={S.stat}>
                      <Text style={[S.statVal, { color: stat.color }]}>{stat.value}</Text>
                      <Text style={S.statLbl}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={S.tapHint}>Tap for full breakdown →</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
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

  logCard: {
    flexDirection: 'row',
    backgroundColor: colors.card, borderRadius: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  colorBar:   { width: 5 },
  cardContent:{ flex: 1, padding: 14 },
  logHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  logDate:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  logDay:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  statsRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat:       { alignItems: 'center' },
  statVal:    { fontSize: 14, fontWeight: '700' },
  statLbl:    { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  tapHint:    { fontSize: 10, color: colors.textMuted, textAlign: 'right' },
});