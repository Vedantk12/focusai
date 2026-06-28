// CalendarScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BASE_URL = 'http://10.194.158.89:8000'; // same as api.js

// ── Risk Color Mapping ─────────────────────────────────
const getRiskColor = (score) => {
  if (score === null || score === undefined) return null;
  const s = parseFloat(score);
  if (s < 25)  return { bg: '#00D4AA', text: '#003D2E', label: 'Low' };
  if (s < 50)  return { bg: '#FFB347', text: '#3D2A00', label: 'Moderate' };
  if (s < 75)  return { bg: '#FF6B6B', text: '#3D0000', label: 'High' };
  return       { bg: '#FF2D55', text: '#FFFFFF',         label: 'Critical' };
};

// ── Helpers ────────────────────────────────────────────
const getDaysInMonth    = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();
const pad = (n) => String(n).padStart(2, '0');
const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Main Screen ────────────────────────────────────────
export default function CalendarScreen({ navigation }) {
  const now = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [logMap,      setLogMap]      = useState({});
  const [loading,     setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [stats,       setStats]       = useState(null);

  // ── Always fresh fetch on focus ──────────────────────
  useFocusEffect(useCallback(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('focusai_token');
        const res   = await axios.get(`${BASE_URL}/logs/month/${year}/${month}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!active) return;

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
        setSelectedDay(null);
        setStats(count > 0 ? {
          avgRisk:  (totalRisk / count).toFixed(1),
          logCount: count,
          bestDay,
          worstDay,
        } : null);
      } catch (e) {
        if (!active) return;
        setLogMap({});
        setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => { active = false; };
  }, [year, month]));

  // ── Month navigation ───────────────────────────────
  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    const n = new Date();
    if (year === n.getFullYear() && month === n.getMonth() + 1) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const handleDayPress = (day) => {
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const today   = new Date();
    const pressed = new Date(dateStr);
    if (pressed > today) return;
    setSelectedDay(day);
    navigation.navigate('Log', { preselectedDate: dateStr });
  };

  // ── Build grid ─────────────────────────────────────
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDay     = getFirstDayOfMonth(year, month);
  const today        = new Date();
  const todayStr     = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      {/* ── Header ── */}
      <View style={S.header}>
        <Text style={S.title}>Calendar</Text>
        <Text style={S.subtitle}>Tap any day to log or edit</Text>
      </View>

      {/* ── Month Navigator ── */}
      <View style={S.monthNav}>
        <TouchableOpacity style={S.navBtn} onPress={goToPrevMonth}>
          <Text style={S.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={S.monthTitle}>{monthNames[month - 1]} {year}</Text>
        <TouchableOpacity
          style={[S.navBtn, (year === today.getFullYear() && month === today.getMonth() + 1) && S.navBtnDisabled]}
          onPress={goToNextMonth}
        >
          <Text style={S.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Legend ── */}
      <View style={S.legend}>
        {[
          { label: 'No log',   bg: colors.cardBorder },
          { label: 'Low',      bg: '#00D4AA' },
          { label: 'Moderate', bg: '#FFB347' },
          { label: 'High',     bg: '#FF6B6B' },
          { label: 'Critical', bg: '#FF2D55' },
        ].map(item => (
          <View key={item.label} style={S.legendItem}>
            <View style={[S.legendDot, { backgroundColor: item.bg }]} />
            <Text style={S.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Calendar Grid ── */}
      <View style={S.calendarCard}>
        <View style={S.dayNamesRow}>
          {dayNames.map(d => (
            <Text key={d} style={S.dayName}>{d}</Text>
          ))}
        </View>

        {loading ? (
          <View style={S.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <View style={S.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={S.emptyCell} />;

              const dateStr   = `${year}-${pad(month)}-${pad(day)}`;
              const log       = logMap[dateStr];
              const riskInfo  = log ? getRiskColor(log.addiction_risk_score) : null;
              const isToday   = dateStr === todayStr;
              const isFuture  = new Date(dateStr) > today;
              const isEditable = !isFuture && new Date(dateStr) >= sevenDaysAgo;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    S.dayCell,
                    riskInfo  && { backgroundColor: riskInfo.bg },
                    isToday   && S.todayCell,
                    isFuture  && S.futureCell,
                  ]}
                  onPress={() => !isFuture && handleDayPress(day)}
                  activeOpacity={isFuture ? 1 : 0.7}
                >
                  <Text style={[
                    S.dayNumber,
                    riskInfo  && { color: riskInfo.text },
                    isToday   && S.todayNumber,
                    isFuture  && S.futureNumber,
                  ]}>
                    {day}
                  </Text>

                  {log && (
                    <Text style={[S.dayScore, { color: riskInfo?.text || '#fff' }]}>
                      {Math.round(parseFloat(log.addiction_risk_score))}
                    </Text>
                  )}

                  {isToday && <View style={S.todayDot} />}

                  {!log && isEditable && !isFuture && (
                    <Text style={S.addDot}>+</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Month Stats ── */}
      {stats && (
        <View style={S.statsCard}>
          <Text style={S.statsTitle}>{monthNames[month - 1]} Summary</Text>
          <View style={S.statsRow}>
            <View style={S.statItem}>
              <Text style={[S.statValue, { color: colors.accent }]}>{stats.logCount}</Text>
              <Text style={S.statLabel}>Days Logged</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statValue, { color: getRiskColor(stats.avgRisk)?.bg || colors.textPrimary }]}>
                {stats.avgRisk}
              </Text>
              <Text style={S.statLabel}>Avg Risk</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={[S.statValue, { color: '#00D4AA' }]}>
                {stats.bestDay ? Math.round(parseFloat(stats.bestDay.addiction_risk_score)) : '-'}
              </Text>
              <Text style={S.statLabel}>Best Day</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Selected Day Detail ── */}
      {selectedDay && (() => {
        const dateStr  = `${year}-${pad(month)}-${pad(selectedDay)}`;
        const log      = logMap[dateStr];
        const riskInfo = log ? getRiskColor(log.addiction_risk_score) : null;

        return (
          <View style={S.detailCard}>
            <View style={S.detailHeader}>
              <Text style={S.detailDate}>
                {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </Text>
              {riskInfo && (
                <View style={[S.detailBadge, { backgroundColor: riskInfo.bg }]}>
                  <Text style={[S.detailBadgeText, { color: riskInfo.text }]}>
                    {riskInfo.label}
                  </Text>
                </View>
              )}
            </View>

            {log ? (
              <>
                <View style={S.detailStats}>
                  {[
                    { label: 'Risk Score',  value: `${Math.round(parseFloat(log.addiction_risk_score))}/100`, color: colors.riskColor },
                    { label: 'Focus Score', value: `${Math.round(parseFloat(log.focus_score || 0))}/100`,     color: colors.focusColor },
                    { label: 'Screen Time', value: `${log.screen_time_hours}h`,                               color: colors.textSecondary },
                    { label: 'Sleep',       value: `${log.sleep_hours}h`,                                     color: colors.productivityColor },
                  ].map((s, i) => (
                    <View key={i} style={S.detailStat}>
                      <Text style={[S.detailStatValue, { color: s.color }]}>{s.value}</Text>
                      <Text style={S.detailStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={S.editButton}
                  onPress={() => navigation.navigate('Log', { preselectedDate: dateStr })}
                >
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={S.editGradient}
                  >
                    <Text style={S.editButtonText}>✏️ Edit This Log</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={S.editButton}
                onPress={() => navigation.navigate('Log', { preselectedDate: dateStr })}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={S.editGradient}
                >
                  <Text style={S.editButtonText}>+ Log This Day</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────
const CELL_SIZE = (width - 40 - 32 - 12) / 7;

const S = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 20, paddingBottom: 60 },

  header:          { marginBottom: 20 },
  title:           { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle:        { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  monthNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  navBtnDisabled:  { opacity: 0.3 },
  navBtnText:      { fontSize: 22, color: colors.textPrimary, fontWeight: '600' },
  monthTitle:      { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  legend:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:       { width: 10, height: 10, borderRadius: 5 },
  legendText:      { fontSize: 11, color: colors.textSecondary },

  calendarCard:    { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  dayNamesRow:     { flexDirection: 'row', marginBottom: 8 },
  dayName:         { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.textMuted },
  loadingBox:      { height: 200, justifyContent: 'center', alignItems: 'center' },
  grid:            { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell:       { width: CELL_SIZE, height: CELL_SIZE + 8, margin: 1 },

  dayCell:         {
    width: CELL_SIZE - 2, height: CELL_SIZE + 6,
    margin: 1, borderRadius: 10,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  todayCell:       { borderWidth: 2, borderColor: colors.accent },
  futureCell:      { opacity: 0.2 },
  dayNumber:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  todayNumber:     { color: colors.accent, fontWeight: '800' },
  futureNumber:    { color: colors.textMuted },
  dayScore:        { fontSize: 9, fontWeight: '700', marginTop: 1 },
  todayDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, position: 'absolute', bottom: 3 },
  addDot:          { fontSize: 14, color: colors.textMuted, fontWeight: '300' },

  statsCard:       { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  statsTitle:      { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem:        { alignItems: 'center', flex: 1 },
  statValue:       { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  statLabel:       { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  statDivider:     { width: 1, height: 40, backgroundColor: colors.cardBorder },

  detailCard:      { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  detailHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailDate:      { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  detailBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  detailBadgeText: { fontSize: 12, fontWeight: '700' },
  detailStats:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  detailStat:      { alignItems: 'center' },
  detailStatValue: { fontSize: 16, fontWeight: '700' },
  detailStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  editButton:      { borderRadius: 14, overflow: 'hidden' },
  editGradient:    { paddingVertical: 14, alignItems: 'center' },
  editButtonText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});

