"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className: string;
  testId?: string;
};

export function PendingSubmitButton({
  idleText,
  pendingText,
  className,
  testId,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      data-testid={testId}
      className={className}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {pending ? pendingText : idleText}
      </span>
    </button>
  );
}
