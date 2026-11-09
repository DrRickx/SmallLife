import { Link } from "react-router-dom";
import { UseAuth } from "../../auth/AuthContext";
import { AuthForm } from "../../components/AuthForm";

export default function login() {
  const { login } = UseAuth();

  return (
    <>
      <AuthForm
        title="Login"
        submitLabel="Log in"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
        onSubmit={(v) => login(v.email, v.password)}
      />
      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </>
  );
}
