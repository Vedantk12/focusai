import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
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

export default function HistoryScreen() {
  const [logs, setLogs]       = useState([]);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>No history yet</Text>
        <Text style={styles.emptySubtitle}>Submit daily logs to see your trends here.</Text>
      </View>
    );
  }

  // Prepare chart data — last 7 logs, reversed to show oldest first
  const chartLogs = [...logs].reverse().slice(0, 7);
  const riskData  = chartLogs.map(l => parseFloat(l.addiction_risk_score) || 0);
  const focusData = chartLogs.map(l => parseFloat(l.focus_score) || 0);
  const labels    = chartLogs.map(l => l.log_date?.slice(5) || '');

  const chartConfig = {
    backgroundColor:      colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo:   colors.card,
    decimalPlaces:          0,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
    propsForBackgroundLines: { stroke: colors.cardBorder },
  };

  // Calculate averages
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your History</Text>
      <Text style={styles.subtitle}>Last {logs.length} days tracked</Text>

      {/* Averages Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Avg Risk',  value: avg(riskData),  color: colors.riskColor },
          { label: 'Avg Focus', value: avg(focusData), color: colors.focusColor },
          { label: 'Days Logged', value: logs.length,  color: colors.productivityColor },
        ].map((item, i) => (
          <View key={i} style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Risk Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Risk Score Trend</Text>
        <LineChart
          data={{ labels, datasets: [{ data: riskData, color: () => colors.riskColor, strokeWidth: 2 }] }}
          width={width - 64}
          height={180}
          chartConfig={{ ...chartConfig, color: () => colors.riskColor }}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
        />
      </View>

      {/* Focus Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Focus Score Trend</Text>
        <LineChart
          data={{ labels, datasets: [{ data: focusData, color: () => colors.focusColor, strokeWidth: 2 }] }}
          width={width - 64}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
        />
      </View>

      {/* Log List */}
      <Text style={styles.listTitle}>All Logs</Text>
      {logs.map((log, index) => (
        <View key={index} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logDate}>{log.log_date}</Text>
            <RiskBadge category={getRiskCategory(parseFloat(log.addiction_risk_score))} />
          </View>
          <View style={styles.logStats}>
            {[
              { label: 'Risk',  value: log.addiction_risk_score, color: colors.riskColor },
              { label: 'Focus', value: log.focus_score,          color: colors.focusColor },
              { label: 'Screen', value: `${log.screen_time_hours}h`, color: colors.textSecondary },
              { label: 'Sleep',  value: `${log.sleep_hours}h`,       color: colors.productivityColor },
            ].map((stat, i) => (
              <View key={i} style={styles.logStat}>
                <Text style={[styles.logStatValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.logStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 20, paddingBottom: 48 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 12 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  emptySubtitle:{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  title:        { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle:     { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },
  summaryRow:   { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard:  {
    flex: 1, backgroundColor: colors.card, borderRadius: 16,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', letterSpacing: -1 },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  chartCard:    {
    backgroundColor: colors.card, borderRadius: 20,
    padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  chartTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  chart:        { borderRadius: 12, marginLeft: -12 },
  listTitle:    { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 8 },
  logCard:      {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  logHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logDate:      { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  logStats:     { flexDirection: 'row', justifyContent: 'space-between' },
  logStat:      { alignItems: 'center' },
  logStatValue: { fontSize: 16, fontWeight: '700' },
  logStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});