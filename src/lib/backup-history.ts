import { DATA_VERSION, exportAppData } from './storage';
import type { AppData } from '../types';

export const BACKUP_HISTORY_KEY = 'sleep-social-tracker-backup-history';
export const UNDO_IMPORT_KEY = 'sleep-social-tracker-undo-import';
export const UNDO_CLEANUP_KEY = 'sleep-social-tracker-undo-cleanup';
export const MAX_BACKUPS = 20;

export interface BackupMeta {
  id: string;
  savedAt: string;
  version: number;
  reason: 'manual' | 'import' | 'cleanup' | 'auto';
  sleepCount: number;
  napCount: number;
  friendCount: number;
  hangoutCount: number;
  ideaCount: number;
  sizeBytes: number;
}

export interface BackupEntry extends BackupMeta {
  snapshot: AppData;
}

export interface BackupHistoryStore {
  backups: BackupEntry[];
}

export function buildBackupMeta(data: AppData, reason: BackupMeta['reason']): BackupMeta {
  const json = exportAppData(data);
  return {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    version: DATA_VERSION,
    reason,
    sleepCount: data.sleepEntries.length,
    napCount: data.napEntries.length,
    friendCount: data.friends.length,
    hangoutCount: data.hangouts.length,
    ideaCount: data.ideas.length,
    sizeBytes: new Blob([json]).size,
  };
}

export function loadBackupHistory(): BackupHistoryStore {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (!raw) return { backups: [] };
    const parsed = JSON.parse(raw) as BackupHistoryStore;
    return { backups: parsed.backups ?? [] };
  } catch {
    return { backups: [] };
  }
}

export function saveBackupHistory(store: BackupHistoryStore): void {
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(store));
}

export function createBackupEntry(data: AppData, reason: BackupMeta['reason']): BackupEntry {
  const meta = buildBackupMeta(data, reason);
  return { ...meta, snapshot: structuredClone(data) };
}

export function addBackupToHistory(data: AppData, reason: BackupMeta['reason']): BackupEntry {
  const entry = createBackupEntry(data, reason);
  const store = loadBackupHistory();
  store.backups.unshift(entry);
  store.backups = store.backups.slice(0, MAX_BACKUPS);
  saveBackupHistory(store);
  return entry;
}

export function deleteBackupFromHistory(id: string): void {
  const store = loadBackupHistory();
  store.backups = store.backups.filter((b) => b.id !== id);
  saveBackupHistory(store);
}

export function getBackupById(id: string): BackupEntry | undefined {
  return loadBackupHistory().backups.find((b) => b.id === id);
}

export function formatBackupReason(reason: BackupMeta['reason']): string {
  switch (reason) {
    case 'manual':
      return 'Manual';
    case 'import':
      return 'Pre-import';
    case 'cleanup':
      return 'Pre-cleanup';
    case 'auto':
      return 'Auto';
    default:
      return reason;
  }
}

export function saveUndoSnapshot(key: string, data: AppData): void {
  localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), snapshot: data }));
}

export function loadUndoSnapshot(key: string): AppData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot: AppData };
    return parsed.snapshot ?? null;
  } catch {
    return null;
  }
}

export function clearUndoSnapshot(key: string): void {
  localStorage.removeItem(key);
}

export function downloadBackupJson(entry: BackupEntry): void {
  const json = exportAppData(entry.snapshot);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sleep-social-backup-${entry.savedAt.slice(0, 10)}-${entry.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
