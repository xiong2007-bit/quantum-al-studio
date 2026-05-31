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
    sessionStorage.setItem('oauth_app_id', appId);
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}`;
  };

  const logout = () => {
    sessionStorage.clear();
    setToken(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  return { isAuthenticated, token, loginWithDeriv, logout, setToken, setIsAuthenticated };
};

