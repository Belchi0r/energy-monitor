import "server-only";

export function isEmailOtpEnabled() {
  return process.env.AUTH_EMAIL_OTP_ENABLED === "true";
}
