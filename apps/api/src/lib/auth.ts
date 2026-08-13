import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@escalation/shared";

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-escalation-secret-change-me"
  );

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  sellerId?: string | null;
  kamId?: string | null;
  opsId?: string | null;
};

export async function signToken(payload: JwtPayload) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    sellerId: payload.sellerId ?? null,
    kamId: payload.kamId ?? null,
    opsId: payload.opsId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret());
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    name: String(payload.name),
    role: payload.role as Role,
    sellerId: (payload.sellerId as string | null) ?? null,
    kamId: (payload.kamId as string | null) ?? null,
    opsId: (payload.opsId as string | null) ?? null,
  };
}
