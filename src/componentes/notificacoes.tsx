"use client";
import { Toaster } from "sonner";
import type { CSSProperties } from "react";
export function Notificacoes() {
  return (
    <Toaster
      position="top-right"
      richColors
      style={
        {
          "--normal-bg": "#fff",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--accent)",
          "--success-text": "var(--accent-foreground)",
          "--success-border": "var(--border)",
          "--error-bg": "#fff1f0",
          "--error-text": "var(--destructive)",
        } as CSSProperties
      }
      closeButton
      duration={3500}
      toastOptions={{ className: "notificacao" }}
    />
  );
}
