import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.5:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Auto-attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('focusai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// -------------------------------------------------------
// AUTH
// -------------------------------------------------------

export const registerUser = async (name, email, password, age, occupation) => {
  const res = await api.post('/auth/register', {
    name, email, password, age: parseInt(age), occupation
  });
  return res.data;
};

export const loginUser = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  const { access_token, user_id, name } = res.data;
  await AsyncStorage.setItem('focusai_token', access_token);
  await AsyncStorage.setItem('focusai_user_id', user_id);
  await AsyncStorage.setItem('focusai_user_name', name);
  return res.data;
};

export const logoutUser = async () => {
  await AsyncStorage.multiRemove([
    'focusai_token', 'focusai_user_id', 'focusai_user_name'
  ]);
};

export const getStoredUser = async () => {
  const [[, token], [, user_id], [, name]] = await AsyncStorage.multiGet([
    'focusai_token', 'focusai_user_id', 'focusai_user_name'
  ]);
  return { token, user_id, name };
};

// -------------------------------------------------------
// LOGS — core
// -------------------------------------------------------

export const checkLogExists = async (logDate = null) => {
  const params = logDate ? { log_date: logDate } : {};
  const res = await api.get('/logs/check', { params });
  return res.data;
};

export const submitDailyLog = async (logData) => {
  const res = await api.post('/logs/submit', logData);
  return res.data;
};

export const getLatestScores = async (userId) => {
  const res = await api.get(`/logs/scores/${userId}`);
  return res.data;
};

export const getHistory = async (userId) => {
  const res = await api.get(`/logs/history/${userId}`);
  return res.data;
};

export const getLogByDate = async (logDate) => {
  const res = await api.get(`/logs/date/${logDate}`);
  return res.data;
};

// -------------------------------------------------------
// CALENDAR
// -------------------------------------------------------

export const getMonthLogs = async (year, month) => {
  const res = await api.get(`/logs/month/${year}/${month}`);
  return res.data;
};

// -------------------------------------------------------
// STREAK
// -------------------------------------------------------

export const getStreak = async (userId) => {
  const res = await api.get(`/logs/streak/${userId}`);
  return res.data;
};

// -------------------------------------------------------
// WEEKLY REPORT
// -------------------------------------------------------

export const getWeeklyReport = async (userId) => {
  const res = await api.get(`/logs/weekly-report/${userId}`);
  return res.data;
};

// -------------------------------------------------------
// BURNOUT PREDICTION
// -------------------------------------------------------

export const getBurnoutPrediction = async (userId) => {
  const res = await api.get(`/logs/burnout/${userId}`);
  return res.data;
};

// -------------------------------------------------------
// GOALS
// -------------------------------------------------------

export const saveGoals = async (goals) => {
  const res = await api.post('/goals/save', goals);
  return res.data;
};

export const getGoals = async (userId) => {
  const res = await api.get(`/goals/${userId}`);
  return res.data;
};

// -------------------------------------------------------
// MOOD JOURNAL
// -------------------------------------------------------

export const saveMoodNote = async (logDate, note) => {
  const res = await api.post('/logs/mood-note', { log_date: logDate, note });
  return res.data;
};

// -------------------------------------------------------
// AI COACH
// -------------------------------------------------------

export const sendCoachMessage = async (message, userId) => {
  const res = await api.post('/coach/chat', { message, user_id: userId });
  return res.data;
};

// -------------------------------------------------------
// OFFLINE SYNC
// -------------------------------------------------------

/**
 * Save a log locally when server is unreachable.
 * Key format: offline_log_YYYY-MM-DD
 */
export const saveLogOffline = async (logData) => {
  const key = `offline_log_${logData.log_date}`;
  await AsyncStorage.setItem(key, JSON.stringify({
    ...logData,
    saved_offline_at: new Date().toISOString()
  }));
};

/**
 * Get all pending offline logs that haven't been synced yet.
 */
export const getPendingOfflineLogs = async () => {
  const allKeys = await AsyncStorage.getAllKeys();
  const offlineKeys = allKeys.filter(k => k.startsWith('offline_log_'));
  if (offlineKeys.length === 0) return [];
  const pairs = await AsyncStorage.multiGet(offlineKeys);
  return pairs.map(([key, value]) => JSON.parse(value));
};

/**
 * Try to sync all pending offline logs to the server.
 * Removes each log from local storage after successful sync.
 * Returns { synced, failed } counts.
 */
export const syncOfflineLogs = async () => {
  const pending = await getPendingOfflineLogs();
  let synced = 0;
  let failed = 0;

  for (const log of pending) {
    try {
      await submitDailyLog(log);
      const key = `offline_log_${log.log_date}`;
      await AsyncStorage.removeItem(key);
      synced++;
    } catch (e) {
      failed++;
    }
  }

  return { synced, failed };
};

/**
 * Submit a log — tries server first, falls back to offline storage.
 * This is what screens should call instead of submitDailyLog directly.
 */
export const submitDailyLogSmart = async (logData) => {
  try {
    const result = await submitDailyLog(logData);
    return { ...result, offline: false };
  } catch (e) {
    // If network error, save offline
    if (!e.response) {
      await saveLogOffline(logData);
      return {
        offline:     true,
        message:     'Saved offline. Will sync when server is available.',
        was_updated: false,
        scores:      null,
        recommendations: []
      };
    }
    throw e; // Re-throw non-network errors (validation etc)
  }
};

/**
 * Check if server is reachable.
 */
export const isServerReachable = async () => {
  try {
    await api.get('/health', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};