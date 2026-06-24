import type { JSX, ReactNode } from "react";

import { createPortal } from "react-dom";

import { Button } from "../../Buttons";
import styles from "./Modal.module.scss";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "default" | "danger";
};

export function Modal({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "default",
}: ModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.content}>{children}</div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
