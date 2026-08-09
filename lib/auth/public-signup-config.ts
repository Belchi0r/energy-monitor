import "server-only";

export function isPublicSignupEnabled() {
  return process.env.AUTH_PUBLIC_SIGNUP_ENABLED === "true";
}
