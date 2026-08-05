const SAFE_URL_ORIGIN = "http://energy-monitor.internal";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function parseSafeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return null;
  }

  let decodedValue = value;

  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const nextValue = decodeURIComponent(decodedValue);

      if (nextValue === decodedValue) {
        break;
      }

      decodedValue = nextValue;
    }
  } catch {
    return null;
  }

  if (
    decodedValue.startsWith("//") ||
    decodedValue.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(decodedValue)
  ) {
    return null;
  }

  try {
    const url = new URL(value, SAFE_URL_ORIGIN);

    if (
      url.origin !== SAFE_URL_ORIGIN ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null;
    }

    const redirectPath = `${url.pathname}${url.search}${url.hash}`;

    if (
      redirectPath.startsWith("//") ||
      redirectPath.includes("\\") ||
      CONTROL_CHARACTER_PATTERN.test(redirectPath)
    ) {
      return null;
    }

    return redirectPath;
  } catch {
    return null;
  }
}

export function resolveSafeRedirectPath(
  value: unknown,
  fallback = "/",
) {
  return (
    parseSafeRedirectPath(value) ??
    parseSafeRedirectPath(fallback) ??
    "/"
  );
}
