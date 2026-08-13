import { STATUS_LABELS, type EscalationStatus } from "@escalation/shared";

const classMap: Record<EscalationStatus, string> = {
  OPEN: "badge-open",
  IN_PROGRESS: "badge-progress",
  WAITING_ON_SELLER: "badge-waiting",
  RESOLVED: "badge-done",
  CLOSED: "badge-done",
  REJECTED: "badge-rejected",
};

export function StatusBadge({ status }: { status: EscalationStatus }) {
  return (
    <span className={`badge ${classMap[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
