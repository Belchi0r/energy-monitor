export type AuthFieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword" | "token", string[]>
>;

export type AuthActionState = {
  status: "idle" | "error" | "signup-success" | "recovery-email-sent";
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export const INITIAL_AUTH_ACTION_STATE: AuthActionState = {
  status: "idle",
};

export type ResendConfirmationActionState = {
  status: "idle" | "error" | "confirmation-resent";
  message?: string;
  fieldErrors?: Pick<AuthFieldErrors, "email">;
};

export const INITIAL_RESEND_CONFIRMATION_ACTION_STATE: ResendConfirmationActionState =
  {
    status: "idle",
  };

export type OtpActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Pick<AuthFieldErrors, "email" | "token">;
};

export const INITIAL_OTP_ACTION_STATE: OtpActionState = {
  status: "idle",
};

export type RecoveryCodeResendActionState = {
  status: "idle" | "error" | "recovery-code-resent";
  message?: string;
  fieldErrors?: Pick<AuthFieldErrors, "email">;
};

export const INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE: RecoveryCodeResendActionState =
  {
    status: "idle",
  };

export type LogoutActionState = {
  status: "idle" | "error";
  message?: string;
};

export const INITIAL_LOGOUT_ACTION_STATE: LogoutActionState = {
  status: "idle",
};
