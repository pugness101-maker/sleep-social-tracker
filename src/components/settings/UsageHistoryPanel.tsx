import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/FormFields';
import type {
  FriendUsageEntry,
  HangoutLogEntry,
  RelationshipLinkUsageEntry,
  UsageLogContent,
} from '../../lib/social-customization-usage';

const DEFAULT_VISIBLE = 5;
const SEARCH_THRESHOLD = 10;

interface UsageHistoryPanelProps {
  content: UsageLogContent;
}

function filterFriendEntries(entries: FriendUsageEntry[], query: string): FriendUsageEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) => e.name.toLowerCase().includes(q) || e.lastSeenLabel.toLowerCase().includes(q)
  );
}

function filterLinkEntries(
  entries: RelationshipLinkUsageEntry[],
  query: string
): RelationshipLinkUsageEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.fromName.toLowerCase().includes(q) ||
      e.toName.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
  );
}

function filterLogEntries(entries: HangoutLogEntry[], query: string): HangoutLogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.dateLabel.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.friendNames.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q)
  );
}

export function UsageHistoryPanel({ content }: UsageHistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const isEmpty = useMemo(() => {
    switch (content.kind) {
      case 'friends':
        return content.entries.length === 0;
      case 'relationship_links':
        return content.entries.length === 0;
      case 'category':
      case 'category_type':
        return (
          content.summary.hangouts === 0 &&
          content.summary.segments === 0 &&
          content.summary.ideas === 0
        );
    }
  }, [content]);

  if (isEmpty) {
    return (
      <div
        className="mt-2 mb-1 ml-0 sm:ml-2 rounded-lg px-3 py-2 text-sm opacity-70 text-left"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        No connected data.
      </div>
    );
  }

  if (content.kind === 'friends') {
    const filtered = filterFriendEntries(content.entries, search);
    const needsSearch = content.entries.length > SEARCH_THRESHOLD;
    const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
    const canExpand = filtered.length > DEFAULT_VISIBLE;

    return (
      <div
        className="mt-2 mb-1 rounded-lg px-3 py-3 text-left text-sm space-y-2"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <p className="font-medium" style={{ color: 'var(--text-heading)' }}>
          {content.label} · {content.entries.length} friend{content.entries.length === 1 ? '' : 's'}
        </p>
        {needsSearch && (
          <Input
            label="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowAll(false);
            }}
            placeholder="Filter by name or last seen…"
          />
        )}
        <ul className="space-y-1.5">
          {visible.map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium">{entry.name}</span>
              <span className="text-xs opacity-60">Last seen: {entry.lastSeenLabel}</span>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && search && (
          <p className="text-xs opacity-60">No matches for &ldquo;{search}&rdquo;.</p>
        )}
        {canExpand && (
          <Button size="sm" variant="ghost" type="button" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all (${filtered.length})`}
          </Button>
        )}
      </div>
    );
  }

  if (content.kind === 'relationship_links') {
    const filtered = filterLinkEntries(content.entries, search);
    const needsSearch = content.entries.length > SEARCH_THRESHOLD;
    const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
    const canExpand = filtered.length > DEFAULT_VISIBLE;

    return (
      <div
        className="mt-2 mb-1 rounded-lg px-3 py-3 text-left text-sm space-y-2"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <p className="font-medium" style={{ color: 'var(--text-heading)' }}>
          {content.label} · {content.entries.length} link{content.entries.length === 1 ? '' : 's'}
        </p>
        {needsSearch && (
          <Input
            label="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowAll(false);
            }}
            placeholder="Filter links…"
          />
        )}
        <ul className="space-y-1.5 font-mono text-xs sm:text-sm">
          {visible.map((entry, i) => (
            <li key={`${entry.fromName}-${entry.toName}-${i}`}>
              {entry.fromName} → {entry.type} → {entry.toName}
            </li>
          ))}
        </ul>
        {filtered.length === 0 && search && (
          <p className="text-xs opacity-60">No matches for &ldquo;{search}&rdquo;.</p>
        )}
        {canExpand && (
          <Button size="sm" variant="ghost" type="button" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all (${filtered.length})`}
          </Button>
        )}
      </div>
    );
  }

  const { summary } = content;
  const title =
    content.kind === 'category'
      ? content.category
      : content.kind === 'occasion'
        ? content.occasion
        : `${content.category} → ${content.type}`;

  const filteredLogs = filterLogEntries(summary.logs, search);
  const needsSearch = summary.logs.length > SEARCH_THRESHOLD;
  const visibleLogs = showAll ? filteredLogs : filteredLogs.slice(0, DEFAULT_VISIBLE);
  const canExpand = filteredLogs.length > DEFAULT_VISIBLE;

  return (
    <div
      className="mt-2 mb-1 rounded-lg px-3 py-3 text-left text-sm space-y-2"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
    >
      <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{title}</p>
      <ul className="text-xs sm:text-sm space-y-0.5 opacity-80">
        <li>Hangouts: {summary.hangouts}</li>
        <li>Segments: {summary.segments}</li>
        <li>Ideas: {summary.ideas}</li>
      </ul>
      {summary.logs.length > 0 && (
        <>
          <p className="text-xs font-medium uppercase tracking-wide opacity-60 pt-1">Recent logs</p>
          {needsSearch && (
            <Input
              label="Search logs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowAll(false);
              }}
              placeholder="Filter by date, type, friends, location…"
            />
          )}
          <ul className="space-y-1.5 text-xs sm:text-sm">
            {visibleLogs.map((log, i) => (
              <li key={`${log.sortTime}-${log.kind}-${i}`} className="leading-snug">
                <span className="opacity-70">{log.dateLabel}</span>
                {' — '}
                <span className="font-medium">{log.type}</span>
                {' — '}
                {log.friendNames}
                {log.location !== '—' && (
                  <>
                    {' — '}
                    <span className="opacity-70">{log.location}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {filteredLogs.length === 0 && search && (
            <p className="text-xs opacity-60">No matches for &ldquo;{search}&rdquo;.</p>
          )}
          {canExpand && (
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show less' : `Show all (${filteredLogs.length})`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
