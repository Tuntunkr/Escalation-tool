import type { Prisma } from "@escalation/db";
import type { JwtPayload } from "./auth.js";

export function escalationAccessWhere(
  user: JwtPayload
): Prisma.EscalationWhereInput {
  if (user.role === "SELLER") {
    if (!user.sellerId) return { id: "__none__" };
    return { sellerId: user.sellerId };
  }
  if (user.role === "KAM") {
    if (!user.kamId) return { id: "__none__" };
    return { seller: { kamId: user.kamId } };
  }
  return {};
}

export function canAccessEscalation(
  user: JwtPayload,
  escalation: { sellerId: string; seller?: { kamId: string | null } }
) {
  if (user.role === "ADMIN" || user.role === "OPS") return true;
  if (user.role === "SELLER") return user.sellerId === escalation.sellerId;
  if (user.role === "KAM") {
    return escalation.seller?.kamId === user.kamId;
  }
  return false;
}
