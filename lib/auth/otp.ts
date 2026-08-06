export const AUTH_EMAIL_OTP_LENGTH = 6;

export const AUTH_EMAIL_OTP_PATTERN = `[0-9]{${AUTH_EMAIL_OTP_LENGTH}}`;

export function normalizeEmailOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, AUTH_EMAIL_OTP_LENGTH);
}
