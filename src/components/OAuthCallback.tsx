import { useEffect, useState } from 'react';
import { useDerivAuth } from '../utils/oauth';

export default function OAuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setToken, setIsAuthenticated } = useDerivAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code || !state) {
        return; // Not an oauth callback
      }

      const storedState = sessionStorage.getItem('oauth_state');
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      const storedAppId = sessionStorage.getItem('oauth_app_id') || '1089';

      if (state !== storedState) {
        setError('State mismatch. Security verification failed.');
        setLoading(false);
        return;
      }

      if (!codeVerifier) {
        setError('Missing code verifier in session cache.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: window.location.origin + '/',
            client_id: storedAppId
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
        }

        const accessToken = data.access_token;
        
        // Store in session storage
        sessionStorage.setItem('deriv_session_token', accessToken);
        setToken(accessToken);
        setIsAuthenticated(true);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, '/');
      } catch (err: any) {
        setError(err.message || 'Network failure during authentication exchange.');
      } finally {
        // Clean up temporary variables
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
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

  if (loading && new URLSearchParams(window.location.search).has('code')) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 font-mono text-sm tracking-widest text-brand-cyan">
        <div className="animate-spin h-8 w-8 border-4 border-brand-cyan border-t-transparent rounded-full mb-4 glow-neon" />
        <span className="animate-pulse">VERIFYING QUANTUM AUTHORIZATION KEY...</span>
      </div>
    );
  }

  return null;
}
