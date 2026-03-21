import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: any, errorInfo: any) {
    // İsteğe bağlı: loglama altyapısına gönderilebilir
    // console.error('UI error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    try {
      // Bazı durumlarda sayfayı yenilemek gerekli olabilir
      if (typeof window !== 'undefined') window.location.reload();
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="max-w-lg text-center space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Beklenmeyen bir hata oluştu</h2>
            <p className="text-sm text-gray-600">Sayfa yüklenirken bir sorunla karşılaştık. Lütfen tekrar deneyin.</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={this.handleRetry} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                Yeniden Dene
              </button>
            </div>
            {/* İsteğe bağlı: hata detayları (geliştirme için) */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-left text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-48">
                {String(this.state.error?.message || this.state.error)}
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
