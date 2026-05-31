"use client";

import { useEffect, useState } from "react";

export type ToastState = {
  id: number;
  kind: "success" | "error";
  message: string;
};

type ToastProps = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      return;
    }

    const showTimer = window.setTimeout(() => setIsVisible(true), 20);
    const hideTimer = window.setTimeout(() => setIsVisible(false), 3800);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [toast]);

  if (!toast) {
    return null;
  }

  const isError = toast.kind === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      data-testid={isError ? "feedback-error" : "feedback-success"}
      onTransitionEnd={() => {
        if (!isVisible) {
          onDismiss();
        }
      }}
      className={`fixed bottom-6 left-1/2 z-50 flex w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-3 text-sm shadow-lg backdrop-blur transition-all duration-200 ease-out sm:max-w-md ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${
        isError
          ? "border-red-200 bg-red-50/95 text-red-700"
          : "border-sky-200 bg-white/95 text-slate-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          isError ? "bg-red-500" : "bg-sky-500"
        }`}
      />
      <span className="min-w-0 whitespace-nowrap">{toast.message}</span>
    </div>
  );
}
