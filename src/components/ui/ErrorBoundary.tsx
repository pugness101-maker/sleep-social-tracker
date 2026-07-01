import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="rounded-lg border p-6 text-left"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg, var(--bg))' }}
        >
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
            Something went wrong
          </h2>
          <p className="text-sm opacity-70 mb-4">
            This section crashed. Your data is still saved — try again or switch to another tab.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs opacity-60 mb-4 overflow-auto max-h-32 p-2 rounded border" style={{ borderColor: 'var(--border)' }}>
              {this.state.error.message}
            </pre>
          )}
          <Button type="button" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
