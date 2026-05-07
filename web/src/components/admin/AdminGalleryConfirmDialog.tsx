import { Modal } from '../Modal';

interface AdminGalleryConfirmDialogProps {
  confirmLabel: string;
  danger?: boolean;
  loading: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

/**
 * Renders a compact confirmation dialog for destructive gallery actions.
 */
export const AdminGalleryConfirmDialog = ({
  confirmLabel,
  danger = false,
  loading,
  message,
  onClose,
  onConfirm,
  open,
  title,
}: AdminGalleryConfirmDialogProps) => {
  return (
    <Modal
      className="gallery-confirm-dialog"
      footer={
        <div className="dialog-actions">
          <button className="secondary-btn" disabled={loading} onClick={onClose} type="button">
            取消
          </button>
          <button className={danger ? 'danger-btn' : 'primary-btn'} disabled={loading} onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      <p>{message}</p>
    </Modal>
  );
};
