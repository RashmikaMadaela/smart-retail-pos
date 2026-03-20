import React from "react";
import i18n from "@/i18n";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : i18n.t("error.unexpected");
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error("Renderer crash", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="panel-card">
            <h2>{i18n.t("error.title")}</h2>
            <p className="muted">{i18n.t("error.subtitle")}</p>
            <p className="notice error">{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()}>
              {i18n.t("error.reload")}
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
