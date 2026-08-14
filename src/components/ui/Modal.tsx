import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Matches Backoffice.dc.html's B4b modal frame: blurred backdrop, centered
 * card. Rendered via a portal straight to document.body rather than in
 * place — otherwise "fixed inset-0" centers itself relative to whatever
 * DOM ancestor it's nested under (here, AppShell's scrollable content
 * div), not the actual browser viewport, which is what made the card
 * look shoved to one side instead of centered on the page.
 */
export function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bo-backdrop p-5 backdrop-blur-[6px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-[480px] flex-col gap-5 overflow-y-auto rounded-2xl bg-bo-surface p-8"
        style={{ boxShadow: "0 30px 70px -20px rgba(20,15,5,0.5)" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
