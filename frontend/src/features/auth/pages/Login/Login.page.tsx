import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/shared/kit";
import { useAuth } from "@/shared/hooks/use-auth";

import styles from "./Login.module.scss";

type LoginLocationState = {
  readonly from?: {
    readonly pathname?: string;
  };
};

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? "/";

  if (status === "authenticated") {
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login({ username, password });
      navigate(redirectPath, { replace: true });
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.header}>
          <div className={styles.icon} aria-hidden="true">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 id="login-title">BeaconWatch</h1>
            <p>Admin access</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Username</span>
            <input
              autoComplete="username"
              autoFocus
              name="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <Button
            fullWidth
            isLoading={isSubmitting}
            leftIcon={<LogIn size={16} />}
            type="submit"
          >
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
