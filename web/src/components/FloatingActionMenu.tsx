import { Command, Palette, Upload } from 'lucide-react';

interface FloatingActionMenuProps {
  open: boolean;
  onCycleTheme: () => void;
  onOpenCommand: () => void;
  onOpenUpload: () => void;
  onToggle: () => void;
}

/**
 * Renders the sage-style playful global shortcut menu.
 */
export const FloatingActionMenu = ({
  open,
  onCycleTheme,
  onOpenCommand,
  onOpenUpload,
  onToggle,
}: FloatingActionMenuProps) => {
  return (
    <div className={open ? 'fab is-open' : 'fab'}>
      <div className="fab-menu">
        <button aria-label="切换主题" onClick={onCycleTheme} type="button">
          <Palette size={17} />
        </button>
        <button aria-label="打开命令面板" onClick={onOpenCommand} type="button">
          <Command size={17} />
        </button>
        <button aria-label="打开上传中心" onClick={onOpenUpload} type="button">
          <Upload size={17} />
        </button>
      </div>
      <button aria-label="快捷菜单" className="fab-main" onClick={onToggle} type="button">
        <span className="snow snow-a" />
        <span className="snow snow-b" />
        <span className="snow snow-c" />
        ❄
      </button>
    </div>
  );
};
