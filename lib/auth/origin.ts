type HeaderReader = {
  get(name: string): string | null;
};

function firstHeaderValue(value: string | null) {
  const firstValue = value?.split(",")[0]?.trim();

  return firstValue || null;
}

function normalizeAppOrigin(
  value: string | null | undefined,
  allowLocalHttp: boolean,
) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(allowLocalHttp && url.protocol === "http:" && isLocalhost))
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAppOrigin(
  requestHeaders: HeaderReader,
  configuredSiteUrl?: string,
) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const configuredOrigin = normalizeAppOrigin(
    configuredSiteUrl,
    isDevelopment,
  );

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (!isDevelopment) {
    return null;
  }

  const forwardedHost = firstHeaderValue(
    requestHeaders.get("x-forwarded-host"),
  );
  const requestHost =
    forwardedHost ?? firstHeaderValue(requestHeaders.get("host"));
  const originHeader = requestHeaders.get("origin");

  if (originHeader) {
    const requestOrigin = normalizeAppOrigin(originHeader, true);

    if (
      requestOrigin &&
      requestHost &&
      new URL(requestOrigin).host.toLowerCase() === requestHost.toLowerCase()
    ) {
      return requestOrigin;
    }

    return null;
  }

  if (!requestHost) {
    return null;
  }

  const forwardedProtocol = firstHeaderValue(
    requestHeaders.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : "http";

  return normalizeAppOrigin(`${protocol}://${requestHost}`, true);
}
