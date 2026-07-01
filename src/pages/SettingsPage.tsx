import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import type { ThemeMode } from '../types';

export function SettingsPage() {
  const { data, updateSettings, exportData, importData, resetData } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sleep-social-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg('Data exported successfully!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        showMsg('Data imported successfully!');
      } catch {
        showMsg('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Settings</h1>
        <p className="text-sm opacity-70 mt-1">Customize your tracker preferences</p>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-social/10 text-social text-sm">{message}</div>
      )}

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Appearance</h2>
          <Select
            label="Theme"
            value={data.settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Sleep & Awake</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Sleep Goal (hours)"
              type="number"
              min={1}
              max={14}
              step={0.5}
              value={data.settings.sleepGoalHours}
              onChange={(e) => updateSettings({ sleepGoalHours: parseFloat(e.target.value) || 8 })}
            />
            <Input
              label="Awake Warning Threshold (hours)"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={data.settings.awakeWarningHours}
              onChange={(e) => updateSettings({ awakeWarningHours: parseFloat(e.target.value) || 16 })}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Notifications</h2>
          <div className="space-y-3 text-left">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.notificationsEnabled}
                onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Enable notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.bedtimeReminder}
                onChange={(e) => updateSettings({ bedtimeReminder: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Bedtime reminder</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.hangoutReminder}
                onChange={(e) => updateSettings({ hangoutReminder: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Hangout reminder</span>
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Backup & Restore</h2>
          <p className="text-sm opacity-70 mb-4 text-left">
            Export your data as JSON for backup, or import a previous backup to restore.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>Export JSON</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import JSON</Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Data Management</h2>
          <p className="text-sm opacity-70 mb-4 text-left">
            All data is stored locally in your browser. Clearing data cannot be undone.
          </p>
          <div className="text-left text-sm opacity-70 mb-4">
            <p>Sleep entries: {data.sleepEntries.length}</p>
            <p>Nap entries: {data.napEntries.length}</p>
            <p>Friends: {data.friends.length}</p>
            <p>Hangouts: {data.hangouts.length}</p>
            <p>Ideas: {data.ideas.length}</p>
          </div>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>Clear All Data</Button>
        </Card>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Clear All Data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { resetData(); setConfirmReset(false); showMsg('All data cleared.'); }}>
              Clear Everything
            </Button>
          </>
        }
      >
        <p>This will permanently delete all sleep, nap, friend, hangout, and idea data.</p>
      </Modal>
    </div>
  );
}
