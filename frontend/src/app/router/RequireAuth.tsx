import type { ReactElement } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";

import { EmptyState } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";

type RequireAuthProps = {
  readonly children: ReactElement;
};

export function RequireAuth({ children }: RequireAuthProps): ReactElement {
  const [location, navigate] = useLocation();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [location, navigate, status]);

  if (status === "checking") {
    return (
      <EmptyState
        loading
        title="Checking session"
        description="Preparing the admin dashboard."
      />
    );
  }

  if (status === "anonymous") {
    return (
      <EmptyState
        loading
        title="Redirecting"
        description="Authentication is required."
      />
    );
  }

  return children;
}
