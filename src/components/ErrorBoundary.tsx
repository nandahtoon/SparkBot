import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { dismissSplashScreen } from '../game/splashScreen';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'An unexpected workshop error occurred.';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    dismissSplashScreen({ minVisibleMs: 0 });
    if (typeof console !== 'undefined' && console.error) {
      console.error('[SparkBot ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-6 text-slate-100"
        >
          <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-slate-900/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Let's try again
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Something went wrong. Try again or restart SparkBot.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-700"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-transform hover:bg-amber-300 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restart</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
