import { NextResponse, type NextRequest } from "next/server";

import { resolveSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const CONFIRMATION_ERROR_PATH = "/login?message=confirmation-error";

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

  if (!code) {
    return createPrivateRedirect(request, CONFIRMATION_ERROR_PATH);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return createPrivateRedirect(request, destination);
    }
  } catch {
    // A resposta pública permanece deliberadamente genérica.
  }

  return createPrivateRedirect(request, CONFIRMATION_ERROR_PATH);
}
