import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthForm } from "../auth/AuthForm";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  return (
    <div className="screen-center">
      <AuthForm
        title="Welcome back"
        subtitle="Log in to your job tracker."
        submitLabel="Log in"
        passwordAutoComplete="current-password"
        onSubmit={async (email, password) => {
          await login(email, password);
          navigate(from, { replace: true });
        }}
        footer={
          <>
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </>
        }
      />
    </div>
  );
}
