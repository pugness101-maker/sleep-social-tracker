import { Button } from '../ui/Button';

interface HangoutBulkToolbarProps {
  selectedCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function HangoutBulkToolbar({
  selectedCount,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onCancel,
}: HangoutBulkToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border shadow-lg max-w-[95vw]"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <span className="text-sm font-medium mr-1 whitespace-nowrap">
        {selectedCount} Hangout{selectedCount === 1 ? '' : 's'} Selected
      </span>
      <Button size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button size="sm" variant="secondary" onClick={onDuplicate}>
        Duplicate
      </Button>
      <Button size="sm" variant="secondary" onClick={onArchive}>
        Archive
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete}>
        Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

interface HangoutBulkUndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function HangoutBulkUndoToast({ message, onUndo, onDismiss }: HangoutBulkUndoToastProps) {
  return (
    <div
      className="mb-4 px-4 py-3 rounded-lg text-sm flex flex-wrap items-center justify-between gap-2"
      style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--text-heading)' }}
      role="status"
    >
      <span>{message}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onUndo}>
          Undo
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
