// LogScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  LogBox, Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { checkLogExists, submitDailyLog } from '../services/api';

LogBox.ignoreLogs(['useInsertionEffect', 'InteractionManager']);

// ── Helpers ────────────────────────────────────────────
const toISO = (d) => d.toISOString().slice(0, 10);

const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return toISO(d);
  });
};

const formatPill = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today     = toISO(new Date());
  const yesterday = (() => { const x = new Date(); x.setDate(x.getDate()-1); return toISO(x); })();
  if (dateStr === today)     return { top: 'Today',     bot: d.toLocaleDateString('en-IN',{ day:'numeric', month:'short' }) };
  if (dateStr === yesterday) return { top: 'Yesterday', bot: d.toLocaleDateString('en-IN',{ day:'numeric', month:'short' }) };
  return {
    top: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    bot: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
};

const formatFull = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

// ── Defaults ───────────────────────────────────────────
const DEFAULT_LOG = {
  screen_time_hours: 5, social_media_hours: 2, gaming_hours: 1,
  study_hours: 3, sleep_hours: 7, mood_score: 6,
  productivity_score: 6, notifications_checked: 40, outside_time_minutes: 30,
};

// ── SliderRow ──────────────────────────────────────────
function SliderRow({ label, value, min, max, step = 0.5, unit, onChange, color = colors.accent }) {
  const display = step < 1 ? Number(value).toFixed(1) : Math.round(value);
  return (
    <View style={S.sliderWrap}>
      <View style={S.sliderHeader}>
        <Text style={S.sliderLabel}>{label}</Text>
        <View style={[S.badge, { backgroundColor: color + '25' }]}>
          <Text style={[S.badgeText, { color }]}>{display}{unit}</Text>
        </View>
      </View>
      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={min} maximumValue={max} step={step} value={value}
        onValueChange={onChange}
        minimumTrackTintColor={color}
        maximumTrackTintColor={colors.cardBorder}
        thumbTintColor={color}
      />
      <View style={S.sliderRange}>
        <Text style={S.rangeText}>{min}{unit}</Text>
        <Text style={S.rangeText}>{max}{unit}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────
export default function LogScreen({ navigation, route }) {
  const days            = getLast7Days();                          // [today … 6 days ago]
  const preselected     = route?.params?.preselectedDate || days[0];
  const initDate        = days.includes(preselected) ? preselected : days[0];

  const [selectedDate,  setSelectedDate]  = useState(initDate);
  const [log,           setLog]           = useState({ ...DEFAULT_LOG });
  const [isEditMode,    setIsEditMode]    = useState(false);
  const [checkingDate,  setCheckingDate]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  const update = (key, val) => setLog(prev => ({ ...prev, [key]: val }));

  const checkDate = useCallback(async (dateStr) => {
    setCheckingDate(true);
    try {
      const result = await checkLogExists(dateStr);
      if (result.exists && result.log) {
        setIsEditMode(true);
        const l = result.log;
        setLog({
          screen_time_hours:     l.screen_time_hours,
          social_media_hours:    l.social_media_hours,
          gaming_hours:          l.gaming_hours,
          study_hours:           l.study_hours,
          sleep_hours:           l.sleep_hours,
          mood_score:            l.mood_score,
          productivity_score:    l.productivity_score,
          notifications_checked: l.notifications_checked,
          outside_time_minutes:  l.outside_time_minutes,
        });
      } else {
        setIsEditMode(false);
        setLog({ ...DEFAULT_LOG });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not check log.');
    } finally {
      setCheckingDate(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const d = route?.params?.preselectedDate || days[0];
    const safe = days.includes(d) ? d : days[0];
    setSelectedDate(safe);
    checkDate(safe);
  }, [route?.params?.preselectedDate]));

  const handleDateChange = (d) => { setSelectedDate(d); checkDate(d); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitDailyLog({ ...log, log_date: selectedDate });
      const action = result.was_updated ? 'Updated' : 'Created';
      Alert.alert(
        `✅ Log ${action}!`,
        `Risk: ${result.scores.addiction_risk_score}/100\n` +
        `Focus: ${result.scores.focus_score}/100\n` +
        `Level: ${result.risk_category}`,
        [{ text: 'Dashboard', onPress: () => navigation.navigate('Dashboard') }]
      );
      checkDate(selectedDate);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Submit failed. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={S.root}>

      {/* ── Top Bar ── */}
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={S.topCenter}>
          <Text style={S.topTitle}>Log Day</Text>
          <Text style={S.topSub}>{formatFull(selectedDate)}</Text>
        </View>
        {/* right spacer keeps title centred */}
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 7-Day Horizontal Date Picker ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.datePillRow}
        >
          {days.map((dateStr) => {
            const { top, bot } = formatPill(dateStr);
            const active = selectedDate === dateStr;
            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => handleDateChange(dateStr)}
                activeOpacity={0.75}
                style={[S.datePill, active && S.datePillActive]}
              >
                {active ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={S.datePillInner}
                  >
                    <Text style={S.pillTopOn}>{top}</Text>
                    <Text style={S.pillBotOn}>{bot}</Text>
                  </LinearGradient>
                ) : (
                  <View style={S.datePillInner}>
                    <Text style={S.pillTopOff}>{top}</Text>
                    <Text style={S.pillBotOff}>{bot}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Mode Badge ── */}
        {checkingDate ? (
          <View style={S.modeBadge}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={S.modeBadgeText}>  Checking…</Text>
          </View>
        ) : (
          <View style={[S.modeBadge, {
            backgroundColor: isEditMode ? colors.moderate + '22' : colors.success + '22',
            borderColor:     isEditMode ? colors.moderate         : colors.success,
          }]}>
            <Text style={[S.modeBadgeText, { color: isEditMode ? colors.moderate : colors.success }]}>
              {isEditMode ? '✏️  Editing existing log' : '✨  New log for this date'}
            </Text>
          </View>
        )}

        {/* ── Screen Time ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>📱 Screen Time</Text>
          <SliderRow label="Total Screen Time"  value={log.screen_time_hours}  min={0} max={16} step={0.5} unit="h"   color={colors.riskColor}  onChange={v => update('screen_time_hours', v)} />
          <SliderRow label="Social Media"        value={log.social_media_hours} min={0} max={8}  step={0.5} unit="h"   color={colors.high}       onChange={v => update('social_media_hours', v)} />
          <SliderRow label="Gaming"              value={log.gaming_hours}       min={0} max={8}  step={0.5} unit="h"   color={colors.moderate}   onChange={v => update('gaming_hours', v)} />
        </View>

        {/* ── Productivity ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>📚 Productivity</Text>
          <SliderRow label="Study / Work"          value={log.study_hours}           min={0}  max={12}  step={0.5} unit="h"  color={colors.focusColor} onChange={v => update('study_hours', v)} />
          <SliderRow label="Notifications Checked" value={log.notifications_checked} min={0}  max={200} step={5}   unit=""   color={colors.moderate}   onChange={v => update('notifications_checked', v)} />
        </View>

        {/* ── Wellbeing ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>🌙 Wellbeing</Text>
          <SliderRow label="Sleep Hours"  value={log.sleep_hours}          min={2}  max={12}  step={0.5} unit="h"    color={colors.productivityColor} onChange={v => update('sleep_hours', v)} />
          <SliderRow label="Outside Time" value={log.outside_time_minutes} min={0}  max={180} step={5}   unit=" min" color={colors.success}           onChange={v => update('outside_time_minutes', v)} />
        </View>

        {/* ── Mood ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>😊 Mood & Energy</Text>
          <SliderRow label="Mood"         value={log.mood_score}         min={1} max={10} step={1} unit="/10" color={colors.gradientStart} onChange={v => update('mood_score', v)} />
          <SliderRow label="Productivity" value={log.productivity_score} min={1} max={10} step={1} unit="/10" color={colors.gradientEnd}   onChange={v => update('productivity_score', v)} />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[S.submitBtn, (submitting || checkingDate) && { opacity: 0.55 }]}
          onPress={handleSubmit}
          disabled={submitting || checkingDate}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.submitGradient}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.submitText}>
                  {isEditMode ? '✏️  Update & Recalculate' : '🧠  Analyse My Day'}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {isEditMode && (
          <Text style={S.editNote}>Saving will recalculate your AI scores and recommendations.</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────
const S = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.background },
  scroll:         { flex: 1 },
  content:        { padding: 16, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingTop:      Platform.OS === 'ios' ? 56 : 44,
    paddingBottom:   12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  topCenter:      { flex: 1, alignItems: 'center' },
  topTitle:       { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  topSub:         { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Date pills
  datePillRow:    { paddingVertical: 16, paddingHorizontal: 4, gap: 10 },
  datePill: {
    width: 72, borderRadius: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  datePillActive: { borderColor: 'transparent', shadowColor: colors.gradientStart, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  datePillInner:  { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  pillTopOn:      { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  pillBotOn:      { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 3 },
  pillTopOff:     { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  pillBotOff:     { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 3 },

  // Mode badge
  modeBadge:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  modeBadgeText:  { fontSize: 13, fontWeight: '600' },

  // Sections
  section:        { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },

  // Slider
  sliderWrap:     { marginBottom: 20 },
  sliderHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sliderLabel:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:      { fontSize: 13, fontWeight: '700' },
  sliderRange:    { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText:      { fontSize: 11, color: colors.textMuted },

  // Submit
  submitBtn:      { borderRadius: 16, overflow: 'hidden', marginTop: 6, shadowColor: colors.gradientStart, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  editNote:       { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 },
});