import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import type { RouteErrorRecovery } from "@/frontend/components/RouteErrorFallback";
import RouteErrorFallback from "@/frontend/components/RouteErrorFallback";

interface ErrorBoundaryProps {
  children: ReactNode;
  recovery: RouteErrorRecovery;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors in child components and displays a recovery UI instead of crashing the
 * entire view. Wrap heavy components (ImageEditor, AnalysisMatchOverlay) so a canvas or analysis error
 * doesn't take down the whole project page.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = (): void => {
    this.setState({ error: null });
    this.props.recovery.onClick();
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <RouteErrorFallback
          error={this.state.error}
          recovery={{ label: this.props.recovery.label, onClick: this.handleReset }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
