import { Modal } from "./Modal";

export function ConfirmDialog({
  confirmLabel = "Delete",
  message,
  onCancel,
  onConfirm,
  title
}: { confirmLabel?: string; message: string; onCancel: () => void; onConfirm: () => void; title: string }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="icon-button" onClick={onCancel}>Cancel</button>
        <button className="primary-button danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}