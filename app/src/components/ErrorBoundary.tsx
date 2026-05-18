import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.fallbackLabel ?? 'Section'} crashed:`, error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-semibold text-sm">{this.props.fallbackLabel ?? 'This section'} encountered an error</p>
            <p className="text-xs text-muted-foreground mt-1">{this.state.error?.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReload}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
