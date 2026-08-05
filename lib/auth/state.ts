export type AuthFieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword", string[]>
>;

export type AuthActionState = {
  status: "idle" | "error" | "signup-success";
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export const INITIAL_AUTH_ACTION_STATE: AuthActionState = {
  status: "idle",
};

export type LogoutActionState = {
  status: "idle" | "error";
  message?: string;
};

export const INITIAL_LOGOUT_ACTION_STATE: LogoutActionState = {
  status: "idle",
};
