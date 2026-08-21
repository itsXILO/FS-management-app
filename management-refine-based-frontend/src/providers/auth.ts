import type { AuthProvider } from "@refinedev/core";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/types";

type LoginParams = {
  email?: string;
  password?: string;
  providerName?: string;
};

type RegisterParams = {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
};

const toError = (message: string) => ({
  message,
  name: "Auth Error",
});

export const authProvider: AuthProvider = {
  async login({ email, password, providerName }: LoginParams) {
    if (providerName) {
      return {
        success: false,
        error: toError("Social sign-in is not configured"),
      };
    }

    const { error } = await authClient.signIn.email({
      email: email ?? "",
      password: password ?? "",
    });

    if (error) {
      return { success: false, error: toError(error.message ?? "Login failed") };
    }

    return { success: true, redirectTo: "/" };
  },

  async register({ email, password, name, role }: RegisterParams) {
    if (!name || !role) {
      return { success: false, error: toError("Name and role are required") };
    }

    const { error } = await authClient.signUp.email({
      email: email ?? "",
      password: password ?? "",
      name,
      role,
    } as Parameters<typeof authClient.signUp.email>[0]);

    if (error) {
      return {
        success: false,
        error: toError(error.message ?? "Registration failed"),
      };
    }

    return { success: true, redirectTo: "/" };
  },

  async logout() {
    await authClient.signOut();
    return { success: true, redirectTo: "/login" };
  },

  async check() {
    try {
      const { data, error } = await authClient.getSession();

      if (data?.session && !error) {
        return { authenticated: true };
      }

      return { authenticated: false, redirectTo: "/login" };
    } catch {
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  async onError(error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    if (statusCode === 401) {
      return { logout: true, redirectTo: "/login" };
    }

    return {};
  },

  async getIdentity() {
    const { data } = await authClient.getSession();

    if (!data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.image ?? undefined,
      role: (data.user as { role?: string }).role as UserRole,
    };
  },
};
