// ScoreGauge.js
// Animated circular gauge component that displays a score visually.
// Used on the Dashboard for all three scores.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ScoreGauge({ score = 0, label, color, size = 120 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    // Animate from 0 to the actual score when component mounts
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  // Calculate stroke dash offset based on animated value
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Color changes based on score value
  const getScoreColor = () => {
    if (label === 'Risk') {
      if (score < 25) return colors.low;
      if (score < 50) return colors.moderate;
      if (score < 75) return colors.high;
      return colors.critical;
    }
    return color;
  };

  const scoreColor = getScoreColor();

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle (grey track) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.cardBorder}
            strokeWidth={10}
            fill="transparent"
          />
          {/* Animated foreground arc */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={scoreColor}
            strokeWidth={10}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            // Start from top (rotate -90 degrees)
            transform={`rotate(-90, ${center}, ${center})`}
          />
        </Svg>
        {/* Score number in center */}
        <View style={[styles.scoreCenter, { width: size, height: size }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>
            {Math.round(score)}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  scoreCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -2,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});