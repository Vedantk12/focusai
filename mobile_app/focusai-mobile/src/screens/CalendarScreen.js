// CalendarScreen.js
// Full month calendar with risk-colored day cells.
// Tap any day to open/edit that day's log.
// Grey = no log, Green = Low, Yellow = Moderate, Red = High, Dark = Critical

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { getStoredUser } from '../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BASE_URL = 'http://192.168.1.5:8000'; // same as api.js

// -------------------------------------------------------
// RISK COLOR MAPPING
// -------------------------------------------------------
const getRiskColor = (score) => {
  if (score === null || score === undefined) return null;
  const s = parseFloat(score);
  if (s < 25)  return { bg: '#00D4AA', text: '#003D2E', label: 'Low' };
  if (s < 50)  return { bg: '#FFB347', text: '#3D2A00', label: 'Moderate' };
  if (s < 75)  return { bg: '#FF6B6B', text: '#3D0000', label: 'High' };
  return       { bg: '#FF2D55', text: '#FFFFFF',         label: 'Critical' };
};

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();
const pad = (n) => String(n).padStart(2, '0');
const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// -------------------------------------------------------
// MAIN SCREEN
// -------------------------------------------------------
export default function CalendarScreen({ navigation }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [logMap, setLogMap] = useState({}); // { "2026-06-25": logObject }
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch all logs for the displayed month
  const fetchMonth = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('focusai_token');
      const res = await axios.get(`${BASE_URL}/logs/month/${y}/${m}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const map = {};
      let totalRisk = 0, count = 0;
      let bestDay = null, worstDay = null;

      res.data.logs.forEach(log => {
        map[log.log_date] = log;
        const risk = parseFloat(log.addiction_risk_score || 0);
        totalRisk += risk;
        count++;
        if (!bestDay  || risk < parseFloat(bestDay.addiction_risk_score))  bestDay  = log;
        if (!worstDay || risk > parseFloat(worstDay.addiction_risk_score)) worstDay = log;
      });

      setLogMap(map);
      setStats(count > 0 ? {
        avgRisk:  (totalRisk / count).toFixed(1),
        logCount: count,
        bestDay,
        worstDay
      } : null);
    } catch (e) {
      setLogMap({});
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchMonth(year, month);
  }, [year, month]));

  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const handleDayPress = (day) => {
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const today   = new Date();
    const pressed = new Date(dateStr);
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 7);

    if (pressed > today) return; // future — do nothing

    setSelectedDay(day);

    // Navigate to LogScreen with the selected date
    navigation.navigate('Log', { preselectedDate: dateStr });
  };

  // Build calendar grid
  const daysInMonth   = getDaysInMonth(year, month);
  const firstDay      = getFirstDayOfMonth(year, month);
  const today         = new Date();
  const todayStr      = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const sevenDaysAgo  = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>Tap any day to log or edit</Text>
      </View>

      {/* ── Month Navigator ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {monthNames[month - 1]} {year}
        </Text>

        <TouchableOpacity
          style={[styles.navBtn, (year === today.getFullYear() && month === today.getMonth() + 1) && styles.navBtnDisabled]}
          onPress={goToNextMonth}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        {[
          { label: 'No log',   bg: colors.cardBorder },
          { label: 'Low',      bg: '#00D4AA' },
          { label: 'Moderate', bg: '#FFB347' },
          { label: 'High',     bg: '#FF6B6B' },
          { label: 'Critical', bg: '#FF2D55' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.bg }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Calendar Grid ── */}
      <View style={styles.calendarCard}>
        {/* Day name headers */}
        <View style={styles.dayNamesRow}>
          {dayNames.map(d => (
            <Text key={d} style={styles.dayName}>{d}</Text>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={styles.emptyCell} />;

              const dateStr  = `${year}-${pad(month)}-${pad(day)}`;
              const log      = logMap[dateStr];
              const riskInfo = log ? getRiskColor(log.addiction_risk_score) : null;
              const isToday  = dateStr === todayStr;
              const isFuture = new Date(dateStr) > today;
              const isEditable = !isFuture && new Date(dateStr) >= sevenDaysAgo;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    riskInfo && { backgroundColor: riskInfo.bg },
                    isToday  && styles.todayCell,
                    isFuture && styles.futureCell,
                  ]}
                  onPress={() => !isFuture && handleDayPress(day)}
                  activeOpacity={isFuture ? 1 : 0.7}
                >
                  <Text style={[
                    styles.dayNumber,
                    riskInfo && { color: riskInfo.text },
                    isToday  && styles.todayNumber,
                    isFuture && styles.futureNumber,
                  ]}>
                    {day}
                  </Text>

                  {/* Score dot */}
                  {log && (
                    <Text style={[styles.dayScore, { color: riskInfo?.text || '#fff' }]}>
                      {Math.round(parseFloat(log.addiction_risk_score))}
                    </Text>
                  )}

                  {/* Today indicator */}
                  {isToday && <View style={styles.todayDot} />}

                  {/* Editable indicator (last 7 days without log) */}
                  {!log && isEditable && !isFuture && (
                    <Text style={styles.addDot}>+</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Month Stats ── */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>
            {monthNames[month - 1]} Summary
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {stats.logCount}
              </Text>
              <Text style={styles.statLabel}>Days Logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getRiskColor(stats.avgRisk)?.bg || colors.textPrimary }]}>
                {stats.avgRisk}
              </Text>
              <Text style={styles.statLabel}>Avg Risk</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#00D4AA' }]}>
                {stats.bestDay ? Math.round(parseFloat(stats.bestDay.addiction_risk_score)) : '-'}
              </Text>
              <Text style={styles.statLabel}>Best Day</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Selected Day Detail ── */}
      {selectedDay && (() => {
        const dateStr = `${year}-${pad(month)}-${pad(selectedDay)}`;
        const log = logMap[dateStr];
        const riskInfo = log ? getRiskColor(log.addiction_risk_score) : null;

        return (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>
                {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </Text>
              {riskInfo && (
                <View style={[styles.detailBadge, { backgroundColor: riskInfo.bg }]}>
                  <Text style={[styles.detailBadgeText, { color: riskInfo.text }]}>
                    {riskInfo.label}
                  </Text>
                </View>
              )}
            </View>

            {log ? (
              <>
                <View style={styles.detailStats}>
                  {[
                    { label: 'Risk Score',   value: `${Math.round(parseFloat(log.addiction_risk_score))}/100`, color: colors.riskColor },
                    { label: 'Focus Score',  value: `${Math.round(parseFloat(log.focus_score || 0))}/100`,     color: colors.focusColor },
                    { label: 'Screen Time', value: `${log.screen_time_hours}h`,  color: colors.textSecondary },
                    { label: 'Sleep',       value: `${log.sleep_hours}h`,        color: colors.productivityColor },
                  ].map((s, i) => (
                    <View key={i} style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.detailStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('Log', { preselectedDate: dateStr })}
                >
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.editGradient}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit This Log</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('Log', { preselectedDate: dateStr })}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.editGradient}
                >
                  <Text style={styles.editButtonText}>+ Log This Day</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

    </ScrollView>
  );
}

// -------------------------------------------------------
// STYLES
// -------------------------------------------------------
const CELL_SIZE = (width - 40 - 32 - 12) / 7;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 20, paddingBottom: 60 },

  header:       { marginBottom: 20 },
  title:        { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle:     { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText:   { fontSize: 22, color: colors.textPrimary, fontWeight: '600' },
  monthTitle:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  legend:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendText:   { fontSize: 11, color: colors.textSecondary },

  calendarCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },

  dayNamesRow:  { flexDirection: 'row', marginBottom: 8 },
  dayName:      { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },

  loadingBox:   { height: 200, justifyContent: 'center', alignItems: 'center' },

  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell:    { width: CELL_SIZE, height: CELL_SIZE + 8, margin: 1 },

  dayCell:      {
    width: CELL_SIZE - 2, height: CELL_SIZE + 6,
    margin: 1, borderRadius: 10,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  todayCell:    { borderWidth: 2, borderColor: colors.accent },
  futureCell:   { opacity: 0.2 },

  dayNumber:    { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  todayNumber:  { color: colors.accent, fontWeight: '800' },
  futureNumber: { color: colors.textMuted },
  dayScore:     { fontSize: 9, fontWeight: '700', marginTop: 1 },

  todayDot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, position: 'absolute', bottom: 3 },
  addDot:       { fontSize: 14, color: colors.textMuted, fontWeight: '300' },

  // Month stats
  statsCard:    { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  statsTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem:     { alignItems: 'center', flex: 1 },
  statValue:    { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  statLabel:    { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  statDivider:  { width: 1, height: 40, backgroundColor: colors.cardBorder },

  // Detail card
  detailCard:   { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailDate:   { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  detailBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  detailBadgeText: { fontSize: 12, fontWeight: '700' },
  detailStats:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  detailStat:   { alignItems: 'center' },
  detailStatValue: { fontSize: 16, fontWeight: '700' },
  detailStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  editButton:   { borderRadius: 14, overflow: 'hidden' },
  editGradient: { paddingVertical: 14, alignItems: 'center' },
  editButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});