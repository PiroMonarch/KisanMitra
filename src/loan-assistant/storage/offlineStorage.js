/**
 * Offline Storage Module - Uses localStorage for offline persistence
 */

const STORAGE_KEYS = Object.freeze({
    PROFILE: 'kisanmitr_profile',
    RESULTS: 'kisanmitr_results',
    SESSIONS: 'kisanmitr_sessions'
});

const MAX_SESSIONS = 10;

function isStorageAvailable() {
    try {
        const testKey = '__test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
    } catch (e) { return false; }
}

export function saveProfile(profile) {
    if (!isStorageAvailable()) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify({ profile, savedAt: Date.now() }));
        return true;
    } catch (e) { return false; }
}

export function loadProfile() {
    if (!isStorageAvailable()) return null;
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return data ? JSON.parse(data).profile : null;
    } catch (e) { return null; }
}

export function clearProfile() {
    if (!isStorageAvailable()) return false;
    try { localStorage.removeItem(STORAGE_KEYS.PROFILE); return true; } catch (e) { return false; }
}

export function saveResults(results) {
    if (!isStorageAvailable()) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify({ results, savedAt: Date.now() }));
        return true;
    } catch (e) { return false; }
}

export function loadResults() {
    if (!isStorageAvailable()) return null;
    try {
        const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
        return data ? JSON.parse(data).results : null;
    } catch (e) { return null; }
}

export function clearResults() {
    if (!isStorageAvailable()) return false;
    try { localStorage.removeItem(STORAGE_KEYS.RESULTS); return true; } catch (e) { return false; }
}

function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

export function saveSession(profile, results) {
    if (!isStorageAvailable()) return false;
    try {
        const sessions = loadAllSessions();
        sessions.unshift({ id: generateSessionId(), profile, results, createdAt: Date.now() });
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
        return true;
    } catch (e) { return false; }
}

export function loadAllSessions() {
    if (!isStorageAvailable()) return [];
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

export function loadSession(sessionId) {
    return loadAllSessions().find(s => s.id === sessionId) || null;
}

export function clearAllData() {
    if (!isStorageAvailable()) return false;
    try {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        return true;
    } catch (e) { return false; }
}

export function getStorageStats() {
    if (!isStorageAvailable()) return { available: false };
    const sessions = loadAllSessions();
    return { available: true, hasProfile: !!loadProfile(), hasResults: !!loadResults(), sessionCount: sessions.length };
}

export default { saveProfile, loadProfile, clearProfile, saveResults, loadResults, clearResults, saveSession, loadAllSessions, loadSession, clearAllData, getStorageStats };
