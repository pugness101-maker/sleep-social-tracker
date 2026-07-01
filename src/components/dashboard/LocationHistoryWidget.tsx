import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { formatLocationDate, getLocationHistory } from '../../lib/location-history';

export function LocationHistoryWidget() {
  const { data } = useApp();
  const locations = useMemo(() => getLocationHistory(data.hangouts, 5), [data.hangouts]);

  return (
    <Card>
      <h3 className="font-semibold mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Location History</h3>
      {locations.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No locations logged yet.</p>
      ) : (
        <ul className="space-y-2 text-left">
          {locations.map((loc) => (
            <li key={loc.location} className="text-sm">
              <p className="font-medium" style={{ color: 'var(--text-heading)' }}>📍 {loc.location}</p>
              <p className="text-xs opacity-70">{loc.visitCount} visits · {loc.totalHours.toFixed(1)}h · Last {formatLocationDate(loc.lastVisit)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
