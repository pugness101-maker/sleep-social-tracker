import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/FormFields';
import { FriendPicker } from './FriendPicker';
import { optionSelectOptions } from '../../lib/social-options';
import {
  formatBulkPreviewMessage,
  formatPairList,
  previewBulkAddRelationships,
  previewBulkRemoveRelationships,
} from '../../lib/bulk-relationships';
import { DEFAULT_RELATIONSHIP_TYPE } from '../../types';

type BulkAction = 'add' | 'remove';

interface BulkRelationshipsBarProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onExitBulkMode: () => void;
  onSuccess: (message: string) => void;
}

export function BulkRelationshipsBar({
  selectedIds,
  onSelectionChange,
  onExitBulkMode,
  onSuccess,
}: BulkRelationshipsBarProps) {
  const { data, bulkAddFriendRelationships, bulkRemoveFriendRelationships } = useApp();
  const [relationshipType, setRelationshipType] = useState(
    data.relationshipTypes[0] ?? DEFAULT_RELATIONSHIP_TYPE
  );
  const [reciprocal, setReciprocal] = useState(true);
  const [removeTypeFilter, setRemoveTypeFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const addPreview = useMemo(
    () => previewBulkAddRelationships(data.friends, selectedIds, relationshipType),
    [data.friends, selectedIds, relationshipType]
  );

  const removePreview = useMemo(
    () => previewBulkRemoveRelationships(
      data.friends,
      selectedIds,
      removeTypeFilter || undefined
    ),
    [data.friends, selectedIds, removeTypeFilter]
  );

  const confirmPreview = confirmAction === 'add' ? addPreview : removePreview;
  const confirmMessage = confirmAction
    ? formatBulkPreviewMessage(confirmAction, confirmPreview, reciprocal)
    : '';

  const handleConfirm = () => {
    if (!confirmAction || selectedIds.length < 2) {
      setConfirmAction(null);
      return;
    }

    if (confirmAction === 'add') {
      const { createdPairs, skippedPairs } = bulkAddFriendRelationships(
        selectedIds,
        relationshipType,
        reciprocal
      );
      if (createdPairs === 0) {
        onSuccess('No new relationships were created. Selected pairs may already be linked.');
      } else {
        const skippedNote =
          skippedPairs > 0 ? ` ${skippedPairs} pair${skippedPairs === 1 ? '' : 's'} skipped (already linked).` : '';
        onSuccess(
          `Created ${createdPairs} relationship pair${createdPairs === 1 ? '' : 's'} as "${relationshipType}".${skippedNote}`
        );
      }
    } else {
      const { removedPairs } = bulkRemoveFriendRelationships(
        selectedIds,
        removeTypeFilter || undefined
      );
      if (removedPairs === 0) {
        onSuccess('No matching relationships were removed.');
      } else {
        const typeNote = removeTypeFilter ? ` (${removeTypeFilter})` : '';
        onSuccess(
          `Removed ${removedPairs} relationship pair${removedPairs === 1 ? '' : 's'}${typeNote}.`
        );
      }
    }

    setConfirmAction(null);
    onSelectionChange([]);
  };

  const canAct = selectedIds.length >= 2;

  return (
    <>
      <Card className="mb-4 border-2 border-indigo-500/50">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="font-medium" style={{ color: 'var(--text-heading)' }}>
            Bulk Relationships
          </p>
          <Button size="sm" variant="secondary" onClick={onExitBulkMode}>
            Exit Bulk Mode
          </Button>
        </div>

        <div className="mb-4">
          <FriendPicker
            label="Select friends"
            selected={selectedIds}
            onChange={onSelectionChange}
          />
        </div>

        {!canAct && (
          <p className="text-sm opacity-70 mb-3">Select at least 2 friends to manage relationships.</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
              Add relationships between selected
            </p>
            <Select
              label="Relationship Type"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              options={optionSelectOptions(data.relationshipTypes, relationshipType)}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={reciprocal}
                onChange={(e) => setReciprocal(e.target.checked)}
                className="rounded"
              />
              Create reciprocal relationships
            </label>
            <Button
              size="sm"
              disabled={!canAct || addPreview.affectedPairs.length === 0}
              onClick={() => setConfirmAction('add')}
            >
              Add Relationships
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
              Remove relationships between selected
            </p>
            <Select
              label="Relationship Type (optional)"
              value={removeTypeFilter}
              onChange={(e) => setRemoveTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All types' },
                ...optionSelectOptions(data.relationshipTypes),
              ]}
            />
            <Button
              size="sm"
              variant="danger"
              disabled={!canAct || removePreview.affectedPairs.length === 0}
              onClick={() => setConfirmAction('remove')}
            >
              Remove Relationships
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'add' ? 'Confirm Add Relationships' : 'Confirm Remove Relationships'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant={confirmAction === 'remove' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={confirmPreview.affectedPairs.length === 0}
            >
              {confirmAction === 'add' ? 'Create Relationships' : 'Remove Relationships'}
            </Button>
          </>
        }
      >
        <p className="mb-3">{confirmMessage}</p>
        {confirmPreview.affectedPairs.length > 0 && (
          <pre
            className="text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
            style={{ background: 'var(--bg-muted, rgba(0,0,0,0.05))' }}
          >
            {formatPairList(data.friends, confirmPreview.affectedPairs)}
          </pre>
        )}
      </Modal>
    </>
  );
}
