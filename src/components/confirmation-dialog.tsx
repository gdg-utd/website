"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
};

export function ConfirmationDialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="confirmation-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="confirmation-dialog-panel">
        <p className="section-label">Please confirm</p>
        <h2 id={titleId}>{title}</h2>
        <div className="confirmation-dialog-description" id={descriptionId}>{description}</div>
        {children}
        <div className="confirmation-dialog-actions">{actions}</div>
      </div>
    </dialog>
  );
}
