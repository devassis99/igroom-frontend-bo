import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Card width in px on a wide screen. Defaults to the B4b frame's 480. */
  width?: number;
  /** Accessible name, when the first heading inside isn't enough. */
  label?: string;
}

/**
 * Matches Backoffice.dc.html's B4b modal frame: blurred backdrop, centered
 * card. Rendered via a portal straight to document.body rather than in
 * place — otherwise "fixed inset-0" centers itself relative to whatever
 * DOM ancestor it's nested under (here, AppShell's scrollable content
 * div), not the actual browser viewport, which is what made the card
 * look shoved to one side instead of centered on the page.
 */
export function Modal({ open, onClose, children, width = 480, label }: ModalProps) {
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
      // On a phone the card becomes a bottom sheet (Sales mobile, B9l):
      // full width, anchored to the bottom edge where a thumb can reach
      // its buttons.
      className="fixed inset-0 z-50 flex items-end justify-center bg-bo-backdrop backdrop-blur-[6px] sm:items-center sm:p-5"
      // Closes only on a click that landed on the backdrop itself. The card
      // used to stopPropagation instead, which meant the card carried a
      // click handler it never needed — and read as an interactive element
      // to anything inspecting the tree.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      {/* Not a <dialog>: that element's UA styles (position, margin, border)
          fight the flex centering above, and showModal() would duplicate the
          backdrop this component already draws. Escape is handled in the
          effect above. */}
      <div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex max-h-[92dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-[24px] bg-bo-surface p-5 pb-8 sm:max-h-full sm:rounded-2xl sm:p-8"
        style={{ maxWidth: width, boxShadow: "0 30px 70px -20px rgba(20,15,5,0.5)" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
