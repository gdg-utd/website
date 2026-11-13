"use client";

import { ResumeInput } from "@/components/resume-input";
import type { Resume } from "@/lib/resume";
import { useFormStatus } from "react-dom";

export function ResumeField({
  resume,
  profileResume,
  error,
  uploading,
  onSelect,
  onUpload,
}: {
  resume: Resume | null;
  profileResume: Resume | null;
  error: string;
  uploading: boolean;
  onSelect: (resume: Resume | null) => void;
  onUpload: (file: File) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <ResumeInput
      resume={resume}
      pending={pending || uploading}
      error={error}
      status={uploading ? "Uploading resume…" : undefined}
      onUpload={onUpload}
      onRemove={() => onSelect(null)}
      onUseProfile={profileResume ? () => onSelect(profileResume) : undefined}
    />
  );
}
