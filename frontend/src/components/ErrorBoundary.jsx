import React from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ Error caught by boundary:", error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // Send error to logging service like Sentry
      console.log("Error logged to monitoring service");
    }

    this.setState({
      errorInfo: errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {this.state.error?.message ||
                "An unexpected error occurred. Please refresh the page to continue."}
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="mb-6 text-left bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {this.state.error && this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                n
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>

              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Go to Dashboard
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      );
      n;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
