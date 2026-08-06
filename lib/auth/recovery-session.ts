import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export const RECOVERY_SESSION_COOKIE = "energy-monitor-recovery";
export const RECOVERY_SESSION_MAX_AGE_SECONDS = 30 * 60;

const RECOVERY_PROOF_VERSION = 1;
const RECOVERY_PROOF_CLOCK_SKEW_SECONDS = 60;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

type RecoveryProofPayload = {
  version: number;
  userId: string;
  accessTokenHash: string;
  issuedAt: number;
  expiresAt: number;
};

type RecoverySessionIdentity = Pick<Session, "access_token" | "user">;

export class RecoveryProofConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryProofConfigurationError";
  }
}

function getRecoveryProofSecret() {
  const secret = process.env.AUTH_RECOVERY_PROOF_SECRET;

  if (!secret) {
    throw new RecoveryProofConfigurationError(
      "AUTH_RECOVERY_PROOF_SECRET não está configurado.",
    );
  }

  if (
    secret.trim().length === 0 ||
    Buffer.byteLength(secret, "utf8") < 32
  ) {
    throw new RecoveryProofConfigurationError(
      "AUTH_RECOVERY_PROOF_SECRET deve possuir pelo menos 32 bytes.",
    );
  }

  return secret;
}

function hashAccessToken(accessToken: string) {
  return createHash("sha256")
    .update(accessToken)
    .digest("base64url");
}

function signEncodedPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function isCanonicalBase64Url(value: string) {
  if (!BASE64URL_PATTERN.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, "base64url");

  return decoded.toString("base64url") === value;
}

function safeEqualBase64Url(left: string, right: string) {
  if (
    !isCanonicalBase64Url(left) ||
    !isCanonicalBase64Url(right)
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "base64url");
  const rightBuffer = Buffer.from(right, "base64url");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function parseRecoveryProofPayload(
  encodedPayload: string,
): RecoveryProofPayload | null {
  if (!isCanonicalBase64Url(encodedPayload)) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    if (
      typeof value !== "object" ||
      value === null ||
      !("version" in value) ||
      !("userId" in value) ||
      !("accessTokenHash" in value) ||
      !("issuedAt" in value) ||
      !("expiresAt" in value) ||
      typeof value.version !== "number" ||
      typeof value.userId !== "string" ||
      typeof value.accessTokenHash !== "string" ||
      typeof value.issuedAt !== "number" ||
      typeof value.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      version: value.version,
      userId: value.userId,
      accessTokenHash: value.accessTokenHash,
      issuedAt: value.issuedAt,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

export function readAuthRedirectType(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("redirectType" in value)
  ) {
    return null;
  }

  return value.redirectType === "recovery" ? "recovery" : null;
}

export function createRecoverySessionProof(
  session: RecoverySessionIdentity,
) {
  const secret = getRecoveryProofSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: RecoveryProofPayload = {
    version: RECOVERY_PROOF_VERSION,
    userId: session.user.id,
    accessTokenHash: hashAccessToken(session.access_token),
    issuedAt,
    expiresAt: issuedAt + RECOVERY_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
  const signature = signEncodedPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function isRecoverySessionProofValid(
  proof: string | undefined,
  session: RecoverySessionIdentity,
) {
  const secret = getRecoveryProofSecret();

  if (!proof) {
    return false;
  }

  const segments = proof.split(".");

  if (segments.length !== 2) {
    return false;
  }

  const [encodedPayload, signature] = segments;

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signEncodedPayload(encodedPayload, secret);

  if (!safeEqualBase64Url(signature, expectedSignature)) {
    return false;
  }

  const payload = parseRecoveryProofPayload(encodedPayload);

  if (
    !payload ||
    payload.version !== RECOVERY_PROOF_VERSION ||
    payload.userId.length === 0 ||
    payload.userId !== session.user.id ||
    !Number.isSafeInteger(payload.issuedAt) ||
    !Number.isSafeInteger(payload.expiresAt) ||
    payload.issuedAt <= 0 ||
    payload.expiresAt - payload.issuedAt !==
      RECOVERY_SESSION_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);

  if (
    payload.expiresAt <= currentTime ||
    payload.issuedAt >
      currentTime + RECOVERY_PROOF_CLOCK_SKEW_SECONDS
  ) {
    return false;
  }

  const expectedAccessTokenHash = hashAccessToken(
    session.access_token,
  );

  return safeEqualBase64Url(
    payload.accessTokenHash,
    expectedAccessTokenHash,
  );
}

type RecoveryAuthContext =
  | {
      status: "valid";
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | {
      status: "authenticated" | "missing";
    };

export async function getRecoveryAuthContext(): Promise<RecoveryAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "missing" };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session || session.user.id !== user.id) {
    return { status: "authenticated" };
  }

  const cookieStore = await cookies();
  const proof = cookieStore.get(RECOVERY_SESSION_COOKIE)?.value;

  if (!isRecoverySessionProofValid(proof, session)) {
    return { status: "authenticated" };
  }

  return { status: "valid", supabase };
}

export async function clearRecoverySessionProof() {
  const cookieStore = await cookies();

  cookieStore.set(RECOVERY_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/reset-password",
    sameSite: "lax",
  });
}
