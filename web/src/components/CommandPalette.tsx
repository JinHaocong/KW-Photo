import { CornerDownLeft, Search } from 'lucide-react';

import type { CommandItem } from '../shared/types';

interface CommandPaletteProps {
  open: boolean;
  keyword: string;
  commands: CommandItem[];
  onChangeKeyword: (keyword: string) => void;
  onClose: () => void;
}

/**
 * Provides a global command surface for keyboard-first navigation.
 */
export const CommandPalette = ({
  open,
  keyword,
  commands,
  onChangeKeyword,
  onClose,
}: CommandPaletteProps) => {
  if (!open) {
    return null;
  }

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredCommands = commands.filter(
    (item) =>
      !normalizedKeyword ||
      item.title.toLowerCase().includes(normalizedKeyword) ||
      item.description.toLowerCase().includes(normalizedKeyword),
  );

  return (
    <div className="overlay command-overlay" onMouseDown={onClose}>
      <section className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input">
          <Search size={18} />
          <input
            autoFocus
            onChange={(event) => onChangeKeyword(event.target.value)}
            placeholder="搜索命令、页面、操作..."
            value={keyword}
          />
          <kbd>ESC</kbd>
        </div>

        <div className="command-list">
          <div className="command-group">应用</div>
          {filteredCommands.map((item, index) => (
            <button
              className={index === 0 ? 'command-item is-active' : 'command-item'}
              key={item.title}
              onClick={() => {
                item.action();
                onClose();
              }}
              type="button"
            >
              <span className="command-icon">{item.icon}</span>
              <span className="command-copy">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
              {index === 0 ? <CornerDownLeft size={14} /> : null}
            </button>
          ))}
        </div>

        <div className="command-footer">
          <span>↑↓ navigate · ↵ open</span>
          <span>MT Photos Command</span>
        </div>
      </section>
    </div>
  );
};
