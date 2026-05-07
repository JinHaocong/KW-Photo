import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
  asForm?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
}

export const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  className = '',
  overlayClassName = '',
  asForm,
  onSubmit,
}: ModalProps) => {
  if (!open) return null;

  const content = (
    <>
      {title && (
        <div className="dialog-header">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
        </div>
      )}
      <div className="dialog-content">
        {children}
      </div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </>
  );

  return (
    <div className={`overlay modal-overlay ${overlayClassName}`.trim()} onMouseDown={onClose}>
      {asForm ? (
        <form
          aria-modal="true"
          className={`dialog ${className}`}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(e);
          }}
          role="dialog"
        >
          {content}
        </form>
      ) : (
        <section 
          aria-modal="true" 
          className={`dialog ${className}`} 
          onMouseDown={(event) => event.stopPropagation()} 
          role="dialog"
        >
          {content}
        </section>
      )}
    </div>
  );
};
