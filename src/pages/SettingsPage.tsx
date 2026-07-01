import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/FormFields';
import { SocialCustomization } from '../components/settings/SocialCustomization';
import { SectionImport } from '../components/settings/SectionImport';
import { SleepSpreadsheetImport } from '../components/settings/SleepSpreadsheetImport';
import { BackupRestorePanel } from '../components/settings/BackupRestorePanel';
import { CleanupTools } from '../components/settings/CleanupTools';
import { DashboardSettings } from '../components/settings/DashboardSettings';
import { IcsCalendarImport } from '../components/social/IcsCalendarImport';
import { SettingsAccordionProvider, useSettingsAccordionContext } from '../components/settings/SettingsAccordionContext';
import { SettingsAccordionSection } from '../components/settings/SettingsAccordionSection';
import { getSleepSchedule } from '../lib/sleep-goals';
import type { ThemeMode } from '../types';

function SettingsPageContent() {
  const { data, updateSettings, exportData, importData, importSections, importSleepSpreadsheet, resetData } = useApp();
  const { isTopOpen, toggleTop, expandAll, collapseAll } = useSettingsAccordionContext();
  const fileRef = useRef<HTMLInputElement>(null);
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
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Settings</h1>
          <p className="text-sm opacity-70 mt-1">Customize your tracker preferences</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={expandAll}>Expand All</Button>
          <Button size="sm" variant="secondary" onClick={collapseAll}>Collapse All</Button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${messageIsError ? '' : 'bg-social/10 text-social'}`}
          style={messageIsError ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : undefined}
        >
          {message}
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        <SettingsAccordionSection
          title="Appearance"
          summary="Theme and display preferences"
          open={isTopOpen('appearance')}
          onToggle={() => toggleTop('appearance')}
        >
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
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Sleep & Awake"
          summary="Sleep goals, bedtime targets, and awake warnings"
          open={isTopOpen('sleep_awake')}
          onToggle={() => toggleTop('sleep_awake')}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="flex items-start sm:items-center gap-3 cursor-pointer">
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
                  className="rounded mt-0.5 sm:mt-0 shrink-0"
                />
                <span className="text-sm">Auto-calculate bedtime from wake-up goal and sleep goal</span>
              </label>
              <label className="flex items-start sm:items-center gap-3 cursor-pointer">
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
                  className="rounded mt-0.5 sm:mt-0 shrink-0"
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
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Friend Picker"
          summary="Sort order when selecting friends for hangouts"
          open={isTopOpen('friend_picker')}
          onToggle={() => toggleTop('friend_picker')}
        >
          <p className="text-sm opacity-70 mb-4">
            Controls how friends are sorted when selecting them for hangouts and activity segments.
          </p>
          <label className="flex items-start sm:items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.settings.friendPickerShowSelectedFirst}
              onChange={(e) => updateSettings({ friendPickerShowSelectedFirst: e.target.checked })}
              className="rounded mt-0.5 sm:mt-0 shrink-0"
            />
            <span className="text-sm">Show selected friends first</span>
          </label>
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Dashboard"
          summary="Choose widgets and their order on your dashboard"
          open={isTopOpen('dashboard')}
          onToggle={() => toggleTop('dashboard')}
        >
          <DashboardSettings onMessage={showMsg} />
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Social Customization"
          summary="Friend tags, groups, statuses, and hangout categories"
          open={isTopOpen('social_customization')}
          onToggle={() => toggleTop('social_customization')}
        >
          <SocialCustomization />
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Backup & Restore"
          summary="Export, import, and backup history"
          open={isTopOpen('backup_restore')}
          onToggle={() => toggleTop('backup_restore')}
        >
          <p className="text-sm opacity-70 mb-4">
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
            <h3 className="font-medium mb-3" style={{ color: 'var(--text-heading)' }}>Backup History</h3>
            <BackupRestorePanel onMessage={showMsg} />
          </div>
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title="Data Management"
          summary="Cleanup tools, bulk edits, and clear all data"
          open={isTopOpen('data_management')}
          onToggle={() => toggleTop('data_management')}
        >
          <CleanupTools onMessage={showMsg} onResetData={resetData} />
        </SettingsAccordionSection>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <SettingsAccordionProvider>
      <SettingsPageContent />
    </SettingsAccordionProvider>
  );
}
