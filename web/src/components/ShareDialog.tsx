interface ShareDialogProps {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onCreate: () => void;
}

/**
 * Collects sharing options for file or album sharing.
 */
export const ShareDialog = ({ open, selectedCount, onClose, onCreate }: ShareDialogProps) => {
  const canCreate = selectedCount > 0;

  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section className="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h2>创建分享链接</h2>
        <p>
          {canCreate
            ? `当前选择 ${selectedCount} 个文件，可配置过期时间、访问密码、EXIF 展示和下载权限。`
            : '当前未选择文件，请先在文件列表中选择后再创建分享。'}
        </p>

        <div className="form-grid">
          <label>
            分享描述
            <input placeholder="请输入分享描述" />
          </label>
          <label>
            过期时间
            <select defaultValue="7">
              <option value="7">7 天后过期</option>
              <option value="30">30 天后过期</option>
              <option value="forever">永久有效</option>
            </select>
          </label>
          <label>
            访问密码
            <input placeholder="留空则由服务端生成或不设置" />
          </label>
          <div className="tag-list">
            <span className="tag is-theme">显示 EXIF</span>
            <span className="tag is-theme">允许下载</span>
            <span className="tag">仅链接访问</span>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="secondary-btn" onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-btn" disabled={!canCreate} onClick={onCreate} type="button">
            生成并复制
          </button>
        </div>
      </section>
    </div>
  );
};
