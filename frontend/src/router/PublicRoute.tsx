import { Navigate, Outlet, useLocation } from "react-router-dom";
import { UseAuth } from "../auth/AuthContext";

// For /login and /register: a logged-in user is sent on, to the page they came from or the dashboard.
// This also handles the redirect right after a successful login or register.
export function PublicOnlyRoute() {
  const { user, loading } = UseAuth();
  const from =
    (useLocation().state as { from?: string } | null)?.from ?? "/dashboard";

  if (loading) return <p>Loading…</p>;
  if (user) return <Navigate to={from} replace />;
  return <Outlet />;
}
