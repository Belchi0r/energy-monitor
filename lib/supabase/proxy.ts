import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isProtectedPagePath,
  isPublicAuthPagePath,
} from "@/lib/auth/routes";

const SUPABASE_CACHE_HEADERS = [
  "cache-control",
  "expires",
  "pragma",
] as const;

function redirectWithSessionCookies(
  destination: URL,
  sessionResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(destination);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  SUPABASE_CACHE_HEADERS.forEach((headerName) => {
    const value = sessionResponse.headers.get(headerName);

    if (value !== null) {
      redirectResponse.headers.set(headerName, value);
    }
  });

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && Boolean(data?.claims?.sub);
  } catch {
    isAuthenticated = false;
  }

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (!isAuthenticated && isProtectedPagePath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    loginUrl.searchParams.set("message", "session-required");

    return redirectWithSessionCookies(loginUrl, supabaseResponse);
  }

  if (isAuthenticated && isPublicAuthPagePath(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";

    return redirectWithSessionCookies(homeUrl, supabaseResponse);
  }

  return supabaseResponse;
}
