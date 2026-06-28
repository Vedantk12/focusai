import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions, TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import RiskBadge from '../components/RiskBadge';
import { getStoredUser, getHistory } from '../services/api';

const { width } = Dimensions.get('window');

const getRiskCategory = (score) => {
  if (score < 25) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 75) return 'High';
  return 'Critical';
};

export default function HistoryScreen({ navigation }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const user = await getStoredUser();
        const data = await getHistory(user.user_id);
        setLogs(data.logs || []);
      } catch (e) {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []));

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={S.center}>
        <Text style={S.emptyEmoji}>📊</Text>
        <Text style={S.emptyTitle}>No history yet</Text>
        <Text style={S.emptySubtitle}>Submit daily logs to see your trends here.</Text>
      </View>
    );
  }

  // Last 7 logs for chart, oldest first
  const chartLogs = [...logs].reverse().slice(-7);
  const riskData  = chartLogs.map(l => parseFloat(l.addiction_risk_score) || 0);
  const focusData = chartLogs.map(l => parseFloat(l.focus_score) || 0);

  // Take last 5 logs for cleaner chart, format as "24/6"
  const chartLogs5 = chartLogs.slice(-5);
  const riskData5  = chartLogs5.map(l => parseFloat(l.addiction_risk_score) || 0);
  const focusData5 = chartLogs5.map(l => parseFloat(l.focus_score) || 0);
  const labels = chartLogs5.map(l => {
    if (!l.log_date) return '';
    const parts = l.log_date.split('-'); // ['2026','06','24']
    return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
  });

  const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '0';

  const baseChartConfig = {
    backgroundColor:        colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo:   colors.card,
    decimalPlaces:          0,
    color:      (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: ()            => colors.textSecondary,
    propsForDots:            { r: '5', strokeWidth: '2', stroke: colors.accent },
    propsForBackgroundLines: { stroke: colors.cardBorder, strokeDasharray: '4' },
    propsForLabels:          { fontSize: 11 },
  };

  // Show only first 3 logs in preview
  const previewLogs = logs.slice(0, 3);

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      {/* ── Header ── */}
      <Text style={S.title}>History</Text>
      <Text style={S.subtitle}>Last {logs.length} days tracked</Text>

      {/* ── Summary Cards ── */}
      <View style={S.summaryRow}>
        {[
          { label: 'Avg Risk',    value: avg(riskData),  color: colors.riskColor },
          { label: 'Avg Focus',   value: avg(focusData), color: colors.focusColor },
          { label: 'Days Logged', value: logs.length,    color: colors.productivityColor },
        ].map((item, i) => (
          <View key={i} style={S.summaryCard}>
            <Text style={[S.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={S.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Risk Trend Chart ── */}
      <View style={S.chartCard}>
        <Text style={S.chartTitle}>Risk Score Trend</Text>
        <Text style={S.chartSub}>Last 7 days · lower is better</Text>
        <LineChart
          data={{
            labels,
            datasets: [{ data: riskData5, color: () => colors.riskColor, strokeWidth: 2.5 }]
          }}
          width={width - 72}
          height={200}
          chartConfig={{
            ...baseChartConfig,
            color: () => colors.riskColor,
            count: 7,
          }}
          bezier
          style={S.chart}
          withInnerLines
          withOuterLines={false}
          fromZero={false}
          segments={6}
        />
      </View>

      {/* ── Focus Trend Chart ── */}
      <View style={S.chartCard}>
        <Text style={S.chartTitle}>Focus Score Trend</Text>
        <Text style={S.chartSub}>Last 7 days · higher is better</Text>
        <LineChart
          data={{
            labels,
            datasets: [{ data: focusData5, color: () => colors.focusColor, strokeWidth: 2.5 }]
          }}
          width={width - 72}
          height={200}
          chartConfig={{
            ...baseChartConfig,
            color: () => colors.focusColor,
            count: 7,
          }}
          bezier
          style={S.chart}
          withInnerLines
          withOuterLines={false}
          fromZero={false}
          segments={6}
        />
      </View>

      {/* ── Recent Logs Preview ── */}
      <View style={S.listHeader}>
        <Text style={S.listTitle}>All Logs</Text>
      </View>

      {previewLogs.map((log, index) => (
        <TouchableOpacity
          key={index}
          style={S.logCard}
          onPress={() => navigation.navigate('LogDetail', { log })}
          activeOpacity={0.75}
        >
          <View style={S.logHeader}>
            <Text style={S.logDate}>{log.log_date}</Text>
            <RiskBadge category={getRiskCategory(parseFloat(log.addiction_risk_score))} />
          </View>
          <View style={S.logStats}>
            {[
              { label: 'Risk',   value: parseFloat(log.addiction_risk_score).toFixed(1), color: colors.riskColor },
              { label: 'Focus',  value: parseFloat(log.focus_score).toFixed(1),          color: colors.focusColor },
              { label: 'Screen', value: `${log.screen_time_hours}h`,                     color: colors.textSecondary },
              { label: 'Sleep',  value: `${log.sleep_hours}h`,                           color: colors.productivityColor },
            ].map((stat, i) => (
              <View key={i} style={S.logStat}>
                <Text style={[S.logStatValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={S.logStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <View style={S.logFooter}>
            <Text style={S.logTap}>Tap for full details →</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* ── View More Button ── */}
      {logs.length > 3 && (
        <TouchableOpacity
          style={S.viewMoreBtn}
          onPress={() => navigation.navigate('AllLogs', { logs })}
          activeOpacity={0.8}
        >
          <Text style={S.viewMoreText}>View All {logs.length} Logs</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 20, paddingBottom: 48 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 12 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  emptySubtitle:{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },

  title:        { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginTop: 12 },
  subtitle:     { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },

  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard:  { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  summaryValue: { fontSize: 20, fontWeight: '800', letterSpacing: -1 },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  chartCard:    { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  chartTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  chartSub:     { fontSize: 11, color: colors.textMuted, marginBottom: 14 },
  chart:        { borderRadius: 12, marginLeft: -8 },

  listHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  listTitle:    { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  logCard:      { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  logHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logDate:      { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  logStats:     { flexDirection: 'row', justifyContent: 'space-between' },
  logStat:      { alignItems: 'center' },
  logStatValue: { fontSize: 16, fontWeight: '700' },
  logStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  logFooter:    { marginTop: 10, alignItems: 'flex-end' },
  logTap:       { fontSize: 11, color: colors.textMuted },

  viewMoreBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.accent, gap: 6,
  },
  viewMoreText: { fontSize: 14, fontWeight: '700', color: colors.accent },
});