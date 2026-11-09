import { Link, Outlet } from "react-router-dom";
import { UseAuth } from "../auth/AuthContext";

export default function PublicLayout() {
  const { user } = UseAuth();
  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        {" | "}
        {user ? (
          <Link to="/dashboard">Dashboard</Link>
        ) : (
          <>
            <Link to="/login">Login</Link>
            {" | "}
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
