import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { EmptyState } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";

type RequireAuthProps = {
  readonly children: ReactElement;
};

export function RequireAuth({ children }: RequireAuthProps): ReactElement {
  const location = useLocation();
  const { status } = useAuth();

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
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
