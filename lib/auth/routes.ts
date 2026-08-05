const PROTECTED_PAGE_PATHS = [
  "/devices",
  "/history",
  "/alerts",
  "/settings",
] as const;

export function isProtectedPagePath(pathname: string) {
  return (
    pathname === "/" ||
    PROTECTED_PAGE_PATHS.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  );
}

export function isPublicAuthPagePath(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}
