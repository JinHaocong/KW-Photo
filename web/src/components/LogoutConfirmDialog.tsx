import { Modal } from './Modal';

interface LogoutConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

/**
 * Renders the logout confirmation dialog before clearing local tokens.
 */
export const LogoutConfirmDialog = ({ onCancel, onConfirm, open }: LogoutConfirmDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <Modal
      className="logout-dialog"
      footer={
        <div className="dialog-actions">
          <button className="secondary-btn" onClick={onCancel} type="button">
            取消
          </button>
          <button className="danger-btn" onClick={onConfirm} type="button">
            确认退出
          </button>
        </div>
      }
      onClose={onCancel}
      open={open}
      title="退出登录"
    >
      <p>退出后会清除当前设备保存的登录态，再次进入需要重新连接并登录服务端。</p>
    </Modal>
  );
};
