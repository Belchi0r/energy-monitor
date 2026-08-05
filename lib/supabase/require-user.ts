import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Autenticação necessária.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationRequiredError();
  }

  return { id: user.id };
}
