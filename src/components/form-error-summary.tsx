"use client";
import { useEffect, useRef } from "react";

export function FormErrorSummary({ message, children }: { message: string; children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message) ref.current?.focus(); }, [message]);
  return <p ref={ref} tabIndex={-1} className="form-error-summary" role="alert">{message} {children}</p>;
}
