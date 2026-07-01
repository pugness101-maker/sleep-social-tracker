import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmModal } from '../ui/Modal';
import { downloadBackupJson, formatBackupReason, formatBackupSize } from '../../lib/backup-history';

interface BackupRestorePanelProps {
  onMessage: (msg: string, isError?: boolean) => void;
}

export function BackupRestorePanel({ onMessage }: BackupRestorePanelProps) {
  const { getBackupHistory, restoreBackup, deleteBackup, undoLastImport, undoLastCleanup, exportData, saveManualBackupToHistory } = useApp();
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const history = useMemo(() => getBackupHistory().backups, [getBackupHistory, historyRefresh]);

  const bumpHistory = () => setHistoryRefresh((n) => n + 1);

  const handleManualBackup = () => {
    saveManualBackupToHistory();
    bumpHistory();
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sleep-social-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onMessage('Backup downloaded.');
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleManualBackup}>Download Backup</Button>
        <Button size="sm" variant="secondary" onClick={() => { if (undoLastImport()) { bumpHistory(); onMessage('Import undone.'); } }}>Undo Last Import</Button>
        <Button size="sm" variant="secondary" onClick={() => { if (undoLastCleanup()) { bumpHistory(); onMessage('Cleanup undone.'); } }}>Undo Last Cleanup</Button>
      </div>

      {history.length === 0 ? (
        <p className="text-sm opacity-70">No backup history yet. Backups are created automatically before imports and cleanups.</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <Card key={entry.id} className="!p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                    {new Date(entry.savedAt).toLocaleString()} · {formatBackupReason(entry.reason)}
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    v{entry.version} · {formatBackupSize(entry.sizeBytes)} · Sleep {entry.sleepCount} · Naps {entry.napCount} · Friends {entry.friendCount} · Hangouts {entry.hangoutCount} · Ideas {entry.ideaCount}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => downloadBackupJson(entry)}>Download</Button>
                  <Button size="sm" variant="secondary" onClick={() => setRestoreId(entry.id)}>Restore</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(entry.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => {
          if (restoreId && restoreBackup(restoreId)) {
            bumpHistory();
            onMessage('Backup restored.');
          } else onMessage('Could not restore backup.', true);
        }}
        title="Restore Backup"
        message="Replace current data with this backup? A snapshot of your current data will be saved first."
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteBackup(deleteId);
          bumpHistory();
          onMessage('Backup deleted.');
        }}
        title="Delete Backup"
        message="Remove this backup from history?"
      />
    </div>
  );
}
