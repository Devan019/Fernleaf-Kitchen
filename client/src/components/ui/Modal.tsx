"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trap focus + close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-[#14281a]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full ${widthClass} max-h-[80vh] flex flex-col overflow-hidden rounded-3xl border border-[#d9d2c2] bg-[#fbfaf6] shadow-[0_25px_70px_rgba(20,40,26,0.18)]`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#eae5d8] px-7 py-4.5 bg-[#f5f1e6]/60">
          <h2
            id="modal-title"
            className="font-serif text-lg font-semibold text-[#26352a]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#78857a] hover:bg-[#eae5d8] hover:text-[#26352a] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
