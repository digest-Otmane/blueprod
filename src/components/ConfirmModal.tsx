"use client";

import React, { useEffect } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Êtes-vous sûr ?",
  description = "Prenez un moment pour vérifier les détails afin de comprendre les implications.",
  cancelText = "Annuler",
  confirmText = "Supprimer",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="confirm-title">
          {title}
        </h3>
        <p className="confirm-desc">
          {description}
        </p>
        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirm-btn-ok"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "En cours..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
