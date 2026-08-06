import { NextResponse, type NextRequest } from "next/server";

import { resolveSafeRedirectPath } from "@/lib/auth/redirect";
import {
  createRecoverySessionProof,
  readAuthRedirectType,
  RECOVERY_SESSION_COOKIE,
  RECOVERY_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/recovery-session";
import { createClient } from "@/lib/supabase/server";

const CONFIRMATION_ERROR_PATH = "/login?message=confirmation-error";
const RECOVERY_ERROR_PATH = "/login?message=recovery-error";

function createPrivateRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(
    new URL(destination, request.nextUrl.origin),
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = resolveSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );
  const errorDestination =
    new URL(destination, request.nextUrl.origin).pathname ===
    "/reset-password"
      ? RECOVERY_ERROR_PATH
      : CONFIRMATION_ERROR_PATH;

  if (!code) {
    return createPrivateRedirect(request, errorDestination);
  }

  try {
    const supabase = await createClient();
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      const hasMatchingIdentity =
        data.session.user.id === data.user.id;
      const redirectType = readAuthRedirectType(data);
      const isRecoveryDestination =
        new URL(destination, request.nextUrl.origin).pathname ===
        "/reset-password";

      if (
        redirectType === "recovery" &&
        hasMatchingIdentity &&
        isRecoveryDestination
      ) {
        const response = createPrivateRedirect(request, "/reset-password");

        response.cookies.set(
          RECOVERY_SESSION_COOKIE,
          createRecoverySessionProof(data.session),
          {
            httpOnly: true,
            maxAge: RECOVERY_SESSION_MAX_AGE_SECONDS,
            path: "/reset-password",
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:",
          },
        );

        return response;
      }

      if (redirectType === "recovery" || isRecoveryDestination) {
        return createPrivateRedirect(request, RECOVERY_ERROR_PATH);
      }

      if (hasMatchingIdentity) {
        return createPrivateRedirect(request, "/");
      }
    }
  } catch {
    // A resposta pública permanece deliberadamente genérica.
  }

  return createPrivateRedirect(request, errorDestination);
}
