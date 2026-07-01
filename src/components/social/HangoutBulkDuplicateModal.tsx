import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/FormFields';
import { format } from 'date-fns';
import type { BulkDuplicateTarget } from '../../lib/hangout-bulk';

interface HangoutBulkDuplicateModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (target: BulkDuplicateTarget) => void;
  selectedCount: number;
}

export function HangoutBulkDuplicateModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
}: HangoutBulkDuplicateModalProps) {
  const [mode, setMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleConfirm = () => {
    if (mode === 'today') onConfirm({ mode: 'today' });
    else if (mode === 'tomorrow') onConfirm({ mode: 'tomorrow' });
    else onConfirm({ mode: 'custom', date: customDate });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Duplicate ${selectedCount} hangout${selectedCount === 1 ? '' : 's'}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Duplicate</Button>
        </>
      }
    >
      <p className="text-sm opacity-70 mb-4 text-left">
        Creates copies with new IDs. Duration is preserved; only the date changes.
      </p>
      <div className="space-y-2 text-left">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" checked={mode === 'today'} onChange={() => setMode('today')} />
          Today
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" checked={mode === 'tomorrow'} onChange={() => setMode('tomorrow')} />
          Tomorrow
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          Custom date
        </label>
        {mode === 'custom' && (
          <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        )}
      </div>
    </Modal>
  );
}
