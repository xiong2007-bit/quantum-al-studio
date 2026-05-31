import { useEffect, useState } from 'react';
import { useDerivAuth } from '../utils/oauth';

export default function OAuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setToken, setIsAuthenticated } = useDerivAuth();

  useEffect(() => {
    const handleAuth = async () => {
      // Deriv returns tokens in the URL parameters like ?acct1=...&token1=...
      const urlParams = new URLSearchParams(window.location.search);
      const token1 = urlParams.get('token1');

      if (!token1) {
        return; // Not an oauth callback
      }

      try {
        // Store in session storage
        sessionStorage.setItem('deriv_session_token', token1);
        setToken(token1);
        setIsAuthenticated(true);
        
        // Clean up URL parameters to hide the token from the address bar
        window.history.replaceState({}, document.title, '/');
      } catch (err: any) {
        setError(err.message || 'Network failure during authentication extraction.');
      } finally {
        sessionStorage.removeItem('oauth_app_id');
        setLoading(false);
      }
    };

    handleAuth();
  }, [setToken, setIsAuthenticated]);

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 font-mono text-sm tracking-widest text-brand-red">
        <div className="p-8 border border-red-900/50 rounded-xl bg-glass max-w-md text-center shadow-lg shadow-red-900/20">
          <h1 className="text-xl font-bold mb-4 font-display text-white">Authentication Failed</h1>
          <p className="text-red-400 mb-6 capitalize">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-2 px-6 bg-red-900/50 text-white font-bold rounded-lg hover:bg-red-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading && new URLSearchParams(window.location.search).has('token1')) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 font-mono text-sm tracking-widest text-brand-cyan">
        <div className="animate-spin h-8 w-8 border-4 border-brand-cyan border-t-transparent rounded-full mb-4 glow-neon" />
        <span className="animate-pulse">VERIFYING QUANTUM AUTHORIZATION KEY...</span>
      </div>
    );
  }

  return null;
}
