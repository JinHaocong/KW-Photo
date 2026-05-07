import { Modal } from '../Modal';

interface AdminGalleryWeightDialogProps {
  galleryName?: string;
  loading: boolean;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  value: string;
}

/**
 * Provides the small weight editor used by gallery cards.
 */
export const AdminGalleryWeightDialog = ({
  galleryName,
  loading,
  onChangeValue,
  onClose,
  onSubmit,
  open,
  value,
}: AdminGalleryWeightDialogProps) => {
  return (
    <Modal
      className="gallery-confirm-dialog"
      footer={
        <div className="dialog-actions">
          <button className="secondary-btn" disabled={loading} onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-btn" disabled={loading} onClick={onSubmit} type="button">
            保存
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title="修改排序权重"
    >
      <p>{galleryName}</p>
      <input
        autoFocus
        inputMode="numeric"
        onChange={(event) => onChangeValue(event.target.value)}
        placeholder="例如 92604"
        value={value}
      />
    </Modal>
  );
};
