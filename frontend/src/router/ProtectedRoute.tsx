import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { User } from "../types/api.types";
import { UseAuth } from "../auth/AuthContext";

type Props = { roles?: User["role"][] };

export function ProtectedRoute({ roles }: Props) {
  const { user, loading } = UseAuth();
  const location = useLocation();

  if (loading) return <p>Loading…</p>; // still checking the refresh cookie
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return <p>403: you don't have access to this page.</p>;
  return <Outlet />;
}
