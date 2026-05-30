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
      {pending ? pendingText : idleText}
    </button>
  );
}
