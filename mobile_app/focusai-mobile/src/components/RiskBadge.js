// RiskBadge.js
// Pill-shaped badge showing risk category with color coding.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const categoryConfig = {
  Low:      { color: colors.low,      bg: colors.low + '22',      emoji: '✅' },
  Moderate: { color: colors.moderate, bg: colors.moderate + '22', emoji: '⚠️' },
  High:     { color: colors.high,     bg: colors.high + '22',     emoji: '🔴' },
  Critical: { color: colors.critical, bg: colors.critical + '22', emoji: '🚨' },
};

export default function RiskBadge({ category = 'Low', large = false }) {
  const config = categoryConfig[category] || categoryConfig.Low;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg, borderColor: config.color },
      large && styles.largeBadge
    ]}>
      <Text style={large ? styles.largeEmoji : styles.emoji}>
        {config.emoji}
      </Text>
      <Text style={[
        styles.text,
        { color: config.color },
        large && styles.largeText
      ]}>
        {category} Risk
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  largeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emoji: { fontSize: 14 },
  largeEmoji: { fontSize: 20 },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  largeText: {
    fontSize: 16,
  },
});