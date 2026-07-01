import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { SocialCustomization } from '../components/settings/SocialCustomization';
import { SectionImport } from '../components/settings/SectionImport';
import { SleepSpreadsheetImport } from '../components/settings/SleepSpreadsheetImport';
import { BackupRestorePanel } from '../components/settings/BackupRestorePanel';
import { CleanupTools } from '../components/settings/CleanupTools';
import { DashboardSettings } from '../components/settings/DashboardSettings';
import { IcsCalendarImport } from '../components/social/IcsCalendarImport';
import { getSleepSchedule } from '../lib/sleep-goals';
import type { ThemeMode } from '../types';

export function SettingsPage() {
  const { data, updateSettings, exportData, importData, importSections, importSleepSpreadsheet, resetData } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const showMsg = (msg: string, isError = false) => {
    setMessage(msg);
    setMessageIsError(isError);
    setTimeout(() => {
      setMessage('');
      setMessageIsError(false);
    }, 4000);
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
      const result = importData(reader.result as string);
      if (result.success) {
        showMsg('Data imported successfully! A backup of your previous data was saved automatically.');
      } else {
        showMsg(result.error ?? 'Invalid JSON file.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const schedule = getSleepSchedule(data.settings);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Settings</h1>
        <p className="text-sm opacity-70 mt-1">Customize your tracker preferences</p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${messageIsError ? '' : 'bg-social/10 text-social'}`}
          style={messageIsError ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : undefined}
        >
          {message}
        </div>
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
          <div className="space-y-4 text-left">
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

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Target Wake-up Time"
                type="time"
                value={data.settings.autoCalculateWakeTime ? schedule.recommendedWakeTime24 : data.settings.targetWakeUpTime}
                disabled={data.settings.autoCalculateWakeTime}
                onChange={(e) => updateSettings({ targetWakeUpTime: e.target.value })}
              />
              <Input
                label="Target Bedtime"
                type="time"
                value={data.settings.autoCalculateBedtime ? schedule.recommendedBedtime24 : data.settings.targetBedtime}
                disabled={data.settings.autoCalculateBedtime}
                onChange={(e) => updateSettings({ targetBedtime: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.settings.autoCalculateBedtime}
                  onChange={(e) =>
                    updateSettings(
                      e.target.checked
                        ? { autoCalculateBedtime: true, autoCalculateWakeTime: false }
                        : { autoCalculateBedtime: false }
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm">Auto-calculate bedtime from wake-up goal and sleep goal</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.settings.autoCalculateWakeTime}
                  onChange={(e) =>
                    updateSettings(
                      e.target.checked
                        ? { autoCalculateWakeTime: true, autoCalculateBedtime: false }
                        : { autoCalculateWakeTime: false }
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm">Auto-calculate wake time from bedtime goal and sleep goal</span>
              </label>
            </div>

            <div
              className="rounded-lg p-4 text-sm space-y-1"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <p className="font-medium" style={{ color: 'var(--text-heading)' }}>Recommendations</p>
              {data.settings.autoCalculateBedtime ? (
                <>
                  <p>
                    Recommended bedtime: <strong>{schedule.recommendedBedtime}</strong>
                    <span className="opacity-60 ml-1">
                      (wake {schedule.effectiveWakeTime} − {schedule.goalHours}h)
                    </span>
                  </p>
                  <p>
                    Recommended wake time: <strong>{schedule.recommendedWakeTime}</strong>
                    <span className="opacity-60 ml-1">(target wake-up)</span>
                  </p>
                </>
              ) : data.settings.autoCalculateWakeTime ? (
                <>
                  <p>
                    Recommended bedtime: <strong>{schedule.recommendedBedtime}</strong>
                    <span className="opacity-60 ml-1">(target bedtime)</span>
                  </p>
                  <p>
                    Recommended wake time: <strong>{schedule.recommendedWakeTime}</strong>
                    <span className="opacity-60 ml-1">
                      (bedtime {schedule.effectiveBedtime} + {schedule.goalHours}h)
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Recommended bedtime: <strong>{schedule.recommendedBedtime}</strong>
                    <span className="opacity-60 ml-1">(manual target)</span>
                  </p>
                  <p>
                    Recommended wake time: <strong>{schedule.recommendedWakeTime}</strong>
                    <span className="opacity-60 ml-1">(manual target)</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Friend Picker</h2>
          <p className="text-sm opacity-70 mb-4 text-left">
            Controls how friends are sorted when selecting them for hangouts and activity segments.
          </p>
          <label className="flex items-center gap-3 cursor-pointer text-left">
            <input
              type="checkbox"
              checked={data.settings.friendPickerShowSelectedFirst}
              onChange={(e) => updateSettings({ friendPickerShowSelectedFirst: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Show selected friends first</span>
          </label>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Dashboard</h2>
          <p className="text-sm opacity-70 mb-4 text-left">Choose which widgets appear on your dashboard and their order.</p>
          <DashboardSettings onMessage={showMsg} />
        </Card>

        <div>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Social Customization</h2>
          <SocialCustomization />
        </div>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Backup & Restore</h2>
          <p className="text-sm opacity-70 mb-4 text-left">
            Export your data as JSON for backup, or import a previous backup to restore.
            Supports full backups with <code className="text-xs">version</code>,{' '}
            <code className="text-xs">exportedAt</code>, and a <code className="text-xs">data</code> object.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>Export JSON</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import JSON</Button>
            <SectionImport
              onImport={(json, preset, mode) => importSections(json, preset, mode)}
              onMessage={showMsg}
            />
            <SleepSpreadsheetImport
              onImport={(sleepEntries, napEntries, mode) =>
                importSleepSpreadsheet(sleepEntries, napEntries, mode)
              }
              onMessage={showMsg}
            />
            <IcsCalendarImport onMessage={showMsg} />
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <div className="mt-6">
            <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Backup History</h3>
            <BackupRestorePanel onMessage={showMsg} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>Data Management</h2>
          <div className="text-left text-sm opacity-70 mb-4">
            <p>Sleep entries (Sleep Log): {data.sleepEntries.length}</p>
            <p>Nap entries (Sleep Log): {data.napEntries.length}</p>
            <p>Friends: {data.friends.length}</p>
            <p>Hangouts: {data.hangouts.length}</p>
            <p>Ideas: {data.ideas.length}</p>
          </div>
          <h3 className="font-medium mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Cleanup Tools</h3>
          <CleanupTools onMessage={showMsg} />
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm opacity-70 mb-4 text-left">All data is stored locally in your browser. Clearing data cannot be undone.</p>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Clear All Data</Button>
          </div>
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
