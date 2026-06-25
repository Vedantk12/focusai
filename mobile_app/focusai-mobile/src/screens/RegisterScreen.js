import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { registerUser, loginUser } from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', age: '', occupation: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const occupations = ['student', 'professional', 'other'];

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.age) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await registerUser(form.name, form.email, form.password, form.age, form.occupation);
      await loginUser(form.email, form.password);
      navigation.replace('MainTabs');
    } catch (error) {
      const msg = error.response?.data?.detail || 'Registration failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your digital wellness journey</Text>
        </View>

        <View style={styles.form}>
          {[
            { key: 'name',     label: 'Full Name',  placeholder: 'Vedant K',              keyboard: 'default' },
            { key: 'email',    label: 'Email',       placeholder: 'you@example.com',       keyboard: 'email-address' },
            { key: 'password', label: 'Password',    placeholder: 'Min 8 characters',      keyboard: 'default', secure: true },
            { key: 'age',      label: 'Age',         placeholder: '20',                    keyboard: 'numeric' },
          ].map(field => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, focused === field.key && styles.inputFocused]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                value={form[field.key]}
                onChangeText={(v) => update(field.key, v)}
                keyboardType={field.keyboard}
                autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                secureTextEntry={field.secure}
                onFocus={() => setFocused(field.key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          ))}

          {/* Occupation selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.occupationRow}>
              {occupations.map(occ => (
                <TouchableOpacity
                  key={occ}
                  style={[
                    styles.occupationChip,
                    form.occupation === occ && styles.occupationChipActive
                  ]}
                  onPress={() => update('occupation', occ)}
                >
                  <Text style={[
                    styles.occupationText,
                    form.occupation === occ && styles.occupationTextActive
                  ]}>
                    {occ.charAt(0).toUpperCase() + occ.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1,
    borderColor: colors.inputBorder, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.textPrimary,
  },
  inputFocused: { borderColor: colors.inputFocus },
  occupationRow: { flexDirection: 'row', gap: 10 },
  occupationChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg, alignItems: 'center',
  },
  occupationChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  occupationText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  occupationTextActive: { color: colors.accent },
  button: {
    borderRadius: 14, overflow: 'hidden', marginTop: 8,
    shadowColor: colors.gradientStart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  gradientButton: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});