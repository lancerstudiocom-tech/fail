import React, { ErrorInfo, ReactNode } from 'react';
import { Card, Button } from './components/ClayUI';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('permission-denied')) {
            isPermissionError = true;
            errorMessage = `Access Denied: You don't have permission to ${parsed.operationType} data at ${parsed.path || 'this location'}.`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0F1014] text-white flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8 flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-serif font-bold">Something went wrong</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                {errorMessage}
              </p>
              {isPermissionError && (
                <p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">
                  Please try refreshing the page or contact support if the problem persists.
                </p>
              )}
            </div>
            <Button 
              onClick={this.handleReset}
              className="w-full py-3 flex items-center justify-center gap-2 bg-[#1B1C22] clay-card-inset"
            >
              <RefreshCcw size={16} />
              <span>Reload Application</span>
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
