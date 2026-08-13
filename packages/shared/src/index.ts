export const ROLES = ["SELLER", "KAM", "OPS", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_SELLER",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;
export type EscalationStatus = (typeof STATUSES)[number];

export const ISSUE_CATEGORIES = [
  "Urgent Delivery",
  "Reattempt Required",
  "Delayed Pickup",
  "POD Issue",
  "Picked Up Scan Not Updated",
  "Address/Contact Number Update",
  "RTO Request",
  "RTO Reason",
  "EDD Breached",
  "Hub Address Required",
  "RTO Delivery Required",
] as const;

export const DEFAULT_POCS = [
  "Khushboo",
  "Ritesh",
  "Amar",
  "Sunita",
  "Harman",
  "Nitesh",
  "Ishita",
  "Akshita",
  "Suhani",
  "Kashish",
] as const;

export const STATUS_LABELS: Record<EscalationStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_SELLER: "Waiting on Seller",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  sellerId?: string | null;
  kamId?: string | null;
  opsId?: string | null;
};

export type ApiError = {
  error: string;
  details?: unknown;
};
