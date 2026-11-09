import { Link, Outlet } from "react-router-dom";
import { UseAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { user, logout } = UseAuth();
  return (
    <>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        {" | "}
        <Link to="/sessions">Sessions</Link>
        {" | "}
        <Link to="/change-password">Change password</Link>
        {user?.role === "owner" && (
          <>
            {" | "}
            <Link to="/">Admin</Link>
          </>
        )}
        {" | "}
        <span>{user?.email}</span> <button onClick={logout}>Log out</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
