import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp, MessageSquare, Wrench } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetError: () => void }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HARDINKAAM ErrorBoundary] Caught runtime exception:', error, errorInfo);
    (this as any).setState({ errorInfo });

    if ((this as any).props.onError) {
      try {
        (this as any).props.onError(error, errorInfo);
      } catch (handlerErr) {
        console.warn('Custom onError handler failed:', handlerErr);
      }
    }
  }

  private handleReset = () => {
    (this as any).setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });

    if ((this as any).props.onReset) {
      try {
        (this as any).props.onReset();
      } catch (resetErr) {
        console.warn('Custom onReset handler failed:', resetErr);
      }
    }
  };

  private handleReload = () => {
    try {
      window.location.reload();
    } catch (_) {
      window.location.href = '/';
    }
  };

  private handleClearCacheAndReload = async () => {
    try {
      // Clear non-critical application caches while retaining basic preferences
      sessionStorage.clear();
      const keysToClear = [
        'hardinkaam_current_tab',
        'hardinkaam_auth_redirect_target',
        'hardinkaam_cart',
        'hardinkaam_pending_booking',
      ];
      keysToClear.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (_) {}
      });

      // Clear Service Worker caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Cache clearing notice:', e);
    }

    // Force reload without cache
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const errorText = [
      `HARDINKAAM App Runtime Error Report`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Error: ${(this as any).state?.error?.name || 'Error'}: ${(this as any).state?.error?.message || 'Unknown error'}`,
      `Stack:\n${(this as any).state?.error?.stack || 'No stack trace'}`,
      `Component Stack:\n${(this as any).state?.errorInfo?.componentStack || 'No component stack'}`,
    ].join('\n\n');

    navigator.clipboard.writeText(errorText).then(() => {
      (this as any).setState({ copied: true });
      setTimeout(() => (this as any).setState({ copied: false }), 2500);
    }).catch(() => {
      // Fallback
      (this as any).setState({ copied: true });
      setTimeout(() => (this as any).setState({ copied: false }), 2500);
    });
  };

  public render(): ReactNode {
    if ((this as any).state?.hasError) {
      const { fallback } = (this as any).props;
      const { error, errorInfo, showDetails, copied } = (this as any).state;

      if (fallback) {
        if (typeof fallback === 'function') {
          return error ? fallback({ error, resetError: this.handleReset }) : null;
        }
        return fallback;
      }

      const errorMessage = error?.message || 'An unexpected error occurred';
      const isChunkLoadError = errorMessage.toLowerCase().includes('dynamically imported module') ||
        errorMessage.toLowerCase().includes('loading chunk') ||
        errorMessage.toLowerCase().includes('failed to fetch');

      return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
          {/* Top Brand Bar */}
          <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Wrench className="w-5 h-5 text-stone-950" />
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                  HARDIN<span className="text-orange-500">KAAM</span>
                </div>
                <div className="text-xs text-stone-400 font-medium">हर दिन का काम, भरोसेमंद नाम</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Bhopal
            </span>
          </header>

          {/* Main Error Card */}
          <main className="max-w-lg w-full mx-auto my-auto py-8">
            <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-center">
              {/* Alert Badge */}
              <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-5 text-orange-400 shadow-inner">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>

              {/* Headings */}
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                कुछ गलत हो गया / Something Went Wrong
              </h1>
              <p className="text-stone-300 text-sm mb-6 leading-relaxed">
                {isChunkLoadError
                  ? 'ऐप का नया वर्ज़न उपलब्ध है। पेज पुनः लोड करें। / A new version of the app is available. Please reload the page.'
                  : 'स्क्रीन लोड करते समय एक अस्थायी समस्या आई। आपका डेटा सुरक्षित है। / An unexpected error occurred. Your data is safe.'}
              </p>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>पेज पुनः लोड करें / Reload</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-semibold text-sm border border-stone-600/80 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>पुनः प्रयास करें / Try Again</span>
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center justify-center gap-4 text-xs pt-2 text-stone-400">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>मुख्य पृष्ठ (Home)</span>
                </button>

                <span>•</span>

                <button
                  type="button"
                  onClick={this.handleClearCacheAndReload}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                  title="Clear temporary storage and perform clean reload"
                >
                  कैश साफ़ करें (Reset App)
                </button>

                <span>•</span>

                <a
                  href="https://wa.me/916267546945?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%20HARDINKAAM,%20%E0%A4%AE%E0%A5%81%E0%A4%9D%E0%A5%87%20%E0%A4%8F%E0%A4%AA%20%E0%A4%AE%E0%A5%87%E0%A4%82%20%E0%A4%B8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%AF%E0%A4%BE%20%E0%A4%86%20%E0%A4%B0%E0%A4%B9%E0%A5%80%20%E0%A4%B9%E0%A5%88"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>सहायता (Help)</span>
                </a>
              </div>

              {/* Collapsible Error Diagnostics */}
              <div className="mt-6 pt-5 border-t border-stone-700/60 text-left">
                <button
                  type="button"
                  onClick={() => (this as any).setState({ showDetails: !showDetails })}
                  className="w-full flex items-center justify-between text-xs text-stone-400 hover:text-stone-200 font-medium py-1 transition-colors cursor-pointer"
                >
                  <span>तकनीकी विवरण / Technical Details</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 text-stone-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-500" />
                  )}
                </button>

                {showDetails && (
                  <div className="mt-3 bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 text-xs font-mono text-stone-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-orange-400">
                        {error?.name || 'Error'}
                      </span>
                      <button
                        type="button"
                        onClick={this.handleCopyError}
                        className="flex items-center gap-1 text-[11px] py-1 px-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Details</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-stone-300 break-words mb-2 font-sans font-medium text-xs">
                      {errorMessage}
                    </div>

                    {errorInfo?.componentStack && (
                      <div className="mt-2 pt-2 border-t border-stone-800/80 max-h-36 overflow-y-auto text-[10px] text-stone-500 leading-tight">
                        <pre className="whitespace-pre-wrap">{errorInfo.componentStack.trim()}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer Branding */}
          <footer className="max-w-2xl w-full mx-auto text-center pt-4 border-t border-stone-800/60 text-xs text-stone-500">
            <p>
              HARDINKAAM • Deepak Buildcon Initiative • Bhopal, Madhya Pradesh • Helpline: +91 62675 46945
            </p>
          </footer>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
