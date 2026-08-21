import { Navigate } from "react-router";
import { SignInForm } from "@/components/refine-ui/form/sign-in-form";
import { useIsAuthenticated } from "@refinedev/core";
import { Loader2 } from "lucide-react";

export const LoginPage = () => {
  const { isLoading, data } = useIsAuthenticated();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data?.authenticated) {
    return <Navigate to="/" replace />;
  }

  return <SignInForm />;
};

export default LoginPage;
