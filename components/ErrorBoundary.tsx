import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-pink-50 text-center">
          <div className="max-w-md p-8 bg-white rounded-2xl shadow-xl border border-pink-100">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">抱歉，出错了</h2>
            <p className="text-gray-600 mb-6">应用渲染过程中遇到了一个意外错误。</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors shadow-md"
            >
              刷新应用
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-gray-50 rounded text-left text-xs overflow-auto max-h-40 text-red-500 border border-gray-100">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
