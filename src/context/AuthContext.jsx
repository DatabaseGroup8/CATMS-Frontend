import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GET, POST, endpoints, setToken } from '../lib/api';
const Context = createContext(null);
const SESSION_KEY = 'catms_user';
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);
  useEffect(() => {
    const fn = () => logout();
    window.addEventListener('catms-unauthorized', fn);
    return () => window.removeEventListener('catms-unauthorized', fn);
  }, [logout]);
  const login = useCallback(async credentials => {
    const response = await POST(endpoints.login, credentials);
    if (!response?.token || !response?.data?.role) throw Error('Unexpected login response. Missing token or role.');
    const person = {
      ...response.data,
      branch_id: response.data.active_branch_id
    };
    setToken(response.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(person));
    setUser(person);
    return person;
  }, []);
  const value = useMemo(() => ({
    user,
    login,
    logout,
    authenticated: !!user
  }), [user, login, logout]);
  return <Context.Provider value={value}>
    {children}
  </Context.Provider>;
}
export const useAuth = () => useContext(Context);
