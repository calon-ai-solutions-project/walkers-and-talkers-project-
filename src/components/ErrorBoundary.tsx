import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Top-level safety net so a render error doesn't leave the user staring
// at a blank white page. Shows the error message + a hard reload button.
// Logged exceptions also go to the console, so DevTools still sees them.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error.message || "Unknown error";
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundImage:
            "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
        }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
            Something went wrong
          </h1>
          <p className="text-sm text-[hsl(228_20%_45%)]">
            The portal hit an unexpected error and stopped rendering.
          </p>
          <pre className="text-xs bg-[hsl(220_22%_95%)] rounded-lg p-3 text-left overflow-auto max-h-40 text-[hsl(228_50%_22%)]">
            {msg}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full h-11 rounded-md text-base font-semibold text-white"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))",
            }}
          >
            Reload
          </button>
          <p className="text-xs text-[hsl(228_20%_55%)]">
            If this keeps happening, sign out and back in, or contact an admin.
          </p>
        </div>
      </main>
    );
  }
}
