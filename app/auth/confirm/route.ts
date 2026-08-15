import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const CONFIRMATION_ERROR_PATH = "/login?message=confirmation-error";
const EMAIL_CONFIRMATION_TYPE = "email";

function createPrivateRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(
    new URL(destination, request.nextUrl.origin),
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const tokenType = request.nextUrl.searchParams.get("type");

  if (!tokenHash || tokenType !== EMAIL_CONFIRMATION_TYPE) {
    return createPrivateRedirect(request, CONFIRMATION_ERROR_PATH);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: EMAIL_CONFIRMATION_TYPE,
    });

    if (
      !error &&
      data.session &&
      data.user &&
      data.session.user.id === data.user.id
    ) {
      const {
        data: { user: currentUser },
        error: currentUserError,
      } = await supabase.auth.getUser();

      if (!currentUserError && currentUser?.id === data.user.id) {
        return createPrivateRedirect(request, "/");
      }
    }

    if (!error && data.session) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Nunca expõe detalhes de uma sessão inconsistente.
      }
    }
  } catch {
    // A resposta pública permanece deliberadamente genérica.
  }

  return createPrivateRedirect(request, CONFIRMATION_ERROR_PATH);
}
