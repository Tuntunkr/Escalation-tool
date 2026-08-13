export function ageHours(createdAt: string | Date) {
  const t = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60));
}

export function AgeBadge({ createdAt, status }: { createdAt: string; status: string }) {
  const open = ["OPEN", "IN_PROGRESS", "WAITING_ON_SELLER"].includes(status);
  if (!open) return null;
  const h = ageHours(createdAt);
  if (h < 24) {
    return (
      <span className="badge badge-open" title="Under 24h">
        {Math.floor(h)}h
      </span>
    );
  }
  if (h < 48) {
    return (
      <span className="badge badge-waiting" title="Aging over 24h">
        {Math.floor(h)}h+
      </span>
    );
  }
  return (
    <span className="badge badge-rejected" title="Aging over 48h — follow up">
      {Math.floor(h)}h SLA
    </span>
  );
}
