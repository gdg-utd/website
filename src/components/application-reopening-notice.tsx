export function ApplicationReopeningNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <div className="application-reopening-notice">
      <strong>Application reopened</strong>
      <p>{reason}</p>
      <p>Review the requested changes and submit your application again while applications are open.</p>
    </div>
  );
}
