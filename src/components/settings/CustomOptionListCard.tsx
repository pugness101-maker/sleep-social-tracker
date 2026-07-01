import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/FormFields';
import { Modal } from '../ui/Modal';

interface CustomOptionListCardProps {
  title: string;
  description: string;
  options: string[];
  usageCount: (name: string) => number;
  defaultFallbackLabel: string;
  onAdd: (name: string) => string | null;
  onEdit: (oldName: string, newName: string) => string | null;
  onDelete: (name: string, resolution: 'default' | 'other' | 'clear', otherName?: string) => void;
}

export function CustomOptionListCard({
  title,
  description,
  options,
  usageCount,
  defaultFallbackLabel,
  onAdd,
  onEdit,
  onDelete,
}: CustomOptionListCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const [deleteAction, setDeleteAction] = useState<'default' | 'other' | 'clear'>('default');
  const [deleteOther, setDeleteOther] = useState('');

  const openAdd = () => {
    setNameInput('');
    setError('');
    setAddOpen(true);
  };

  const openEdit = (name: string) => {
    setEditTarget(name);
    setNameInput(name);
    setError('');
  };

  const openDelete = (name: string) => {
    setDeleteTarget(name);
    setDeleteAction('default');
    setDeleteOther(options.find((o) => o !== name) ?? '');
    setError('');
  };

  const handleAdd = () => {
    const err = onAdd(nameInput);
    if (err) {
      setError(err);
      return;
    }
    setAddOpen(false);
    setNameInput('');
  };

  const handleEdit = () => {
    if (!editTarget) return;
    const err = onEdit(editTarget, nameInput);
    if (err) {
      setError(err);
      return;
    }
    setEditTarget(null);
    setNameInput('');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteAction === 'other' && !deleteOther) {
      setError('Please choose a replacement.');
      return;
    }
    onDelete(deleteTarget, deleteAction, deleteAction === 'other' ? deleteOther : undefined);
    setDeleteTarget(null);
    setError('');
  };

  const deleteUsage = deleteTarget ? usageCount(deleteTarget) : 0;
  const otherOptions = deleteTarget ? options.filter((o) => o !== deleteTarget) : [];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="text-left">
          <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
          <p className="text-sm opacity-70 mt-1">{description}</p>
        </div>
        <Button size="sm" onClick={openAdd}>Add</Button>
      </div>

      {options.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No options yet. Add one to get started.</p>
      ) : (
        <ul className="divide-y text-left" style={{ borderColor: 'var(--border)' }}>
          {options.map((option) => (
            <li key={option} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{option}</span>
                {usageCount(option) > 0 && (
                  <span className="text-xs opacity-60 ml-2">({usageCount(option)} in use)</span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(option)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => openDelete(option)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add ${title.replace(/s$/, '')}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </>
        }
      >
        <Input
          label="Name"
          value={nameInput}
          onChange={(e) => { setNameInput(e.target.value); setError(''); }}
          placeholder="Enter name"
          autoFocus
        />
        {error && <p className="text-sm text-danger mt-2 text-left">{error}</p>}
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Option"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </>
        }
      >
        <Input
          label="Name"
          value={nameInput}
          onChange={(e) => { setNameInput(e.target.value); setError(''); }}
          autoFocus
        />
        {error && <p className="text-sm text-danger mt-2 text-left">{error}</p>}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Option"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-left mb-4">
          Delete <strong>{deleteTarget}</strong>?
          {deleteUsage > 0 && (
            <span> {deleteUsage} item{deleteUsage !== 1 ? 's' : ''} currently use this option.</span>
          )}
        </p>

        {deleteUsage > 0 && (
          <div className="space-y-2 text-left">
            <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>What should happen to affected items?</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="deleteAction" checked={deleteAction === 'default'} onChange={() => { setDeleteAction('default'); setError(''); }} />
              Move to {defaultFallbackLabel}
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="deleteAction" checked={deleteAction === 'other'} onChange={() => { setDeleteAction('other'); setError(''); }} />
              Choose another
            </label>
            {deleteAction === 'other' && (
              <Select
                value={deleteOther}
                onChange={(e) => { setDeleteOther(e.target.value); setError(''); }}
                options={otherOptions.map((o) => ({ value: o, label: o }))}
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="deleteAction" checked={deleteAction === 'clear'} onChange={() => { setDeleteAction('clear'); setError(''); }} />
              Clear (remove value)
            </label>
          </div>
        )}

        {error && <p className="text-sm text-danger mt-3 text-left">{error}</p>}
      </Modal>
    </Card>
  );
}
