import React from "react";

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
    const message = error instanceof Error ? error.message : "Unexpected renderer error";
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
            <h2>Something went wrong</h2>
            <p className="muted">The POS UI hit an unexpected error.</p>
            <p className="notice error">{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload App
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
