import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertTitle className="mb-2 text-lg font-semibold">Something went wrong</AlertTitle>
              <AlertDescription>
                <div className="space-y-4">
                  <p>An error occurred in the application. Technical details:</p>
                  <div className="bg-gray-800 text-gray-200 p-3 rounded text-xs overflow-auto max-h-32">
                    {this.state.error && this.state.error.toString()}
                  </div>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={this.handleRetry}
                      className="flex items-center space-x-2"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again</span>
                    </Button>
                    <Button 
                      onClick={this.handleGoHome}
                      className="flex items-center space-x-2"
                    >
                      <Home className="h-4 w-4" />
                      <span>Go Home</span>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;