import { FormEvent } from "react";

type LoginViewProps = {
  username: string;
  password: string;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function LoginView(props: LoginViewProps) {
  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>Smart Retail POS Next</h1>
        <p className="muted">Electron + React migration shell</p>
        <form onSubmit={props.onSubmit}>
          <label>
            Username
            <input value={props.username} onChange={(event) => props.onUsernameChange(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
            />
          </label>
          {props.error ? <p className="error">{props.error}</p> : null}
          <button type="submit">Login</button>
        </form>
      </section>
    </main>
  );
}
