import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, LogBox
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { checkLogExists, submitDailyLog } from '../services/api';

LogBox.ignoreLogs(['useInsertionEffect', 'InteractionManager']);

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------
const getToday = () => new Date().toISOString().slice(0, 10);
const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const formatDisplay = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

// -------------------------------------------------------
// DEFAULTS
// -------------------------------------------------------
const DEFAULT_LOG = {
  screen_time_hours:     5,
  social_media_hours:    2,
  gaming_hours:          1,
  study_hours:           3,
  sleep_hours:           7,
  mood_score:            6,
  productivity_score:    6,
  notifications_checked: 40,
  outside_time_minutes:  30,
};

// -------------------------------------------------------
// SLIDER ROW COMPONENT
// -------------------------------------------------------
function SliderRow({ label, value, min, max, step = 0.5, unit, onChange, color = colors.accent }) {
  const display = step < 1
    ? Number(value).toFixed(1)
    : Math.round(value);

  return (
    <View style={S.sliderWrap}>
      <View style={S.sliderHeader}>
        <Text style={S.sliderLabel}>{label}</Text>
        <View style={[S.badge, { backgroundColor: color + '22' }]}>
          <Text style={[S.badgeText, { color }]}>{display}{unit}</Text>
        </View>
      </View>
      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
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

// -------------------------------------------------------
// MAIN SCREEN
// -------------------------------------------------------
export default function LogScreen({ navigation, route }) {
  const today           = getToday();
  const yesterday       = getYesterday();
  const preselectedDate = route?.params?.preselectedDate || today;

  const [selectedDate, setSelectedDate] = useState(preselectedDate);
  const [log,          setLog]          = useState({ ...DEFAULT_LOG });
  const [isEditMode,   setIsEditMode]   = useState(false);
  const [checkingDate, setCheckingDate] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  const update = (key, val) => setLog(prev => ({ ...prev, [key]: val }));

  // Check if a log exists for the selected date
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
      const msg = err.response?.data?.detail || 'Could not check log.';
      Alert.alert('Date Error', msg);
    } finally {
      setCheckingDate(false);
    }
  }, []);

  // Run whenever screen is focused or preselectedDate changes
  useFocusEffect(useCallback(() => {
    const dateToUse = route?.params?.preselectedDate || today;
    setSelectedDate(dateToUse);
    checkDate(dateToUse);
  }, [route?.params?.preselectedDate]));

  const handleDateChange = (d) => {
    setSelectedDate(d);
    checkDate(d);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...log, log_date: selectedDate };
      const result  = await submitDailyLog(payload);
      const action  = result.was_updated ? 'Updated' : 'Created';
      Alert.alert(
        `✅ Log ${action}!`,
        `Risk: ${result.scores.addiction_risk_score}/100\n` +
        `Focus: ${result.scores.focus_score}/100\n` +
        `Level: ${result.risk_category}`,
        [{ text: 'Dashboard', onPress: () => navigation.navigate('Dashboard') }]
      );
      checkDate(selectedDate);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submit failed. Is server running?';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which date tabs to show
  const isPreselectedOther = preselectedDate !== today && preselectedDate !== yesterday;
  const dateTabs = [
    { label: 'Today',     val: today },
    { label: 'Yesterday', val: yesterday },
    ...(isPreselectedOther ? [{
      label: new Date(preselectedDate + 'T00:00:00')
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      val: preselectedDate
    }] : [])
  ];

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      <Text style={S.title}>Daily Log</Text>

      {/* ── Date Selector ── */}
      <View style={S.dateCard}>
        <Text style={S.dateCardLabel}>SELECT DATE</Text>
        <View style={S.dateTabs}>
          {dateTabs.map(({ label, val }) => (
            <TouchableOpacity
              key={val}
              style={[S.dateTab, selectedDate === val && S.dateTabActive]}
              onPress={() => handleDateChange(val)}
            >
              {selectedDate === val ? (
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={S.dateTabGradient}
                >
                  <Text style={S.dateTabTextOn}>{label}</Text>
                </LinearGradient>
              ) : (
                <Text style={S.dateTabTextOff}>{label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={S.dateDisplay}>{formatDisplay(selectedDate)}</Text>
      </View>

      {/* ── Mode Badge ── */}
      {checkingDate ? (
        <View style={S.modeBadge}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={S.modeBadgeText}>Checking...</Text>
        </View>
      ) : (
        <View style={[
          S.modeBadge,
          {
            backgroundColor: isEditMode ? colors.moderate + '22' : colors.success + '22',
            borderColor:     isEditMode ? colors.moderate          : colors.success,
          }
        ]}>
          <Text style={[S.modeBadgeText, { color: isEditMode ? colors.moderate : colors.success }]}>
            {isEditMode
              ? '✏️  Edit Mode — updating existing log'
              : '✨  Create Mode — new log for this date'}
          </Text>
        </View>
      )}

      {/* ── Screen Time ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>📱 Screen Time</Text>
        <SliderRow label="Total Screen Time"  value={log.screen_time_hours}  min={0} max={16} step={0.5} unit="h"    color={colors.riskColor}    onChange={v => update('screen_time_hours', v)} />
        <SliderRow label="Social Media"       value={log.social_media_hours} min={0} max={8}  step={0.5} unit="h"    color={colors.high}         onChange={v => update('social_media_hours', v)} />
        <SliderRow label="Gaming"             value={log.gaming_hours}       min={0} max={8}  step={0.5} unit="h"    color={colors.moderate}     onChange={v => update('gaming_hours', v)} />
      </View>

      {/* ── Productivity ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>📚 Productivity</Text>
        <SliderRow label="Study / Work"          value={log.study_hours}            min={0}   max={12}  step={0.5} unit="h"   color={colors.focusColor}  onChange={v => update('study_hours', v)} />
        <SliderRow label="Notifications Checked" value={log.notifications_checked}  min={0}   max={200} step={5}   unit=""    color={colors.moderate}    onChange={v => update('notifications_checked', v)} />
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
        style={[S.submitBtn, (submitting || checkingDate) && { opacity: 0.6 }]}
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
        <Text style={S.editNote}>
          Saving will recalculate your AI scores and recommendations.
        </Text>
      )}

    </ScrollView>
  );
}

// -------------------------------------------------------
// STYLES
// -------------------------------------------------------
const S = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 20, paddingBottom: 60 },
  title:          { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 20 },

  dateCard:       { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
  dateCardLabel:  { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  dateTabs:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateTab:        { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  dateTabActive:  { borderColor: 'transparent' },
  dateTabGradient:{ paddingVertical: 10, alignItems: 'center' },
  dateTabTextOn:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  dateTabTextOff: { color: colors.textSecondary, fontWeight: '600', fontSize: 14, paddingVertical: 10, textAlign: 'center' },
  dateDisplay:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  modeBadge:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 8 },
  modeBadgeText:  { fontSize: 13, fontWeight: '600' },

  section:        { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: colors.cardBorder },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },

  sliderWrap:     { marginBottom: 20 },
  sliderHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sliderLabel:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:      { fontSize: 13, fontWeight: '700' },
  sliderRange:    { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText:      { fontSize: 11, color: colors.textMuted },

  submitBtn:      { borderRadius: 16, overflow: 'hidden', marginTop: 6, shadowColor: colors.gradientStart, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  editNote:       { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 },
});