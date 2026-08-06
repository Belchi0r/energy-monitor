const PROTECTED_PAGE_PATHS = [
  "/devices",
  "/history",
  "/alerts",
  "/settings",
  "/reset-password",
] as const;

const PUBLIC_AUTH_PAGE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
] as const;

const AUTH_PAGE_PATHS = [
  ...PUBLIC_AUTH_PAGE_PATHS,
  "/reset-password",
] as const;

function matchesPathname(
  pathname: string,
  paths: readonly string[],
) {
  return paths.some((path) => pathname === path);
}

export function isProtectedPagePath(pathname: string) {
  return (
    pathname === "/" ||
    PROTECTED_PAGE_PATHS.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  );
}

export function isPublicAuthPagePath(pathname: string) {
  return matchesPathname(pathname, PUBLIC_AUTH_PAGE_PATHS);
}

export function isAuthPagePath(pathname: string) {
  return matchesPathname(pathname, AUTH_PAGE_PATHS);
}
