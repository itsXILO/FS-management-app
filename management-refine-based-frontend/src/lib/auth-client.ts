import { createAuthClient } from "better-auth/react";
import { BACKEND_BASE_URL } from "@/constants";

export const authClient = createAuthClient({
	// undefined -> better-auth defaults to window.location.origin (same-origin deployments)
	baseURL: BACKEND_BASE_URL || undefined,
	fetchOptions: {
		credentials: "include",
	},
});
