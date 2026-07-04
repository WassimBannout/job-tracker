import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthForm } from "../auth/AuthForm";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="screen-center">
      <AuthForm
        title="Create your account"
        subtitle="Start tracking your job search."
        submitLabel="Sign up"
        passwordAutoComplete="new-password"
        onSubmit={async (email, password) => {
          await signup(email, password);
          navigate("/", { replace: true });
        }}
        footer={
          <>
            Already have an account? <Link to="/login">Log in</Link>
          </>
        }
      />
    </div>
  );
}
