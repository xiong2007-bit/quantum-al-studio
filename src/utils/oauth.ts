export const generateRandomString = (length: number) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
};

export const generateCodeChallenge = async (verifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

import { useState, useEffect } from 'react';

export const useDerivAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('deriv_session_token');
    if (sessionToken) {
      setToken(sessionToken);
      setIsAuthenticated(true);
    }
  }, []);

  const loginWithDeriv = async (appId: string) => {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_app_id', appId);

    const redirectUri = window.location.origin + '/';
    const authUrl = new URL('https://oauth.deriv.com/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', appId);
    authUrl.searchParams.append('app_id', appId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'trade account_manage');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  };

  const logout = () => {
    sessionStorage.clear();
    setToken(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  return { isAuthenticated, token, loginWithDeriv, logout, setToken, setIsAuthenticated };
};

