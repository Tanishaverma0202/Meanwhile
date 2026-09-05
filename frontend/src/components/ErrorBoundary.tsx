import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col items-center justify-center p-6 text-[#16324A]">
          <div className="bg-white border border-[#D7E6F2] rounded-xl p-8 max-w-md w-full text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FDF2F2] border border-[#F8D7D7] text-[#D64545] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#16324A]">Something went wrong</h2>
              <p className="text-xs text-[#637789] mt-1 leading-relaxed">
                Meanwhile encountered an unexpected rendering exception. Your watchlist data remains intact.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1677C8] hover:bg-[#125fa2] text-white font-semibold text-xs rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
