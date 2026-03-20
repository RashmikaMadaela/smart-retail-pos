import { FormEvent } from "react";
import { useTranslation } from "react-i18next";

type LoginViewProps = {
  username: string;
  password: string;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function LoginView(props: LoginViewProps) {
  const { t } = useTranslation();

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>{t("login.title")}</h1>
        <p className="muted">{t("login.subtitle")}</p>
        <form onSubmit={props.onSubmit}>
          <label>
            {t("login.username")}
            <input value={props.username} onChange={(event) => props.onUsernameChange(event.target.value)} />
          </label>
          <label>
            {t("login.password")}
            <input
              type="password"
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
            />
          </label>
          {props.error ? <p className="error">{props.error}</p> : null}
          <button type="submit">{t("login.submit")}</button>
        </form>
      </section>
    </main>
  );
}
