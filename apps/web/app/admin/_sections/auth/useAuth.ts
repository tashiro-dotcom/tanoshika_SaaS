'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { postJson } from '../../_lib/api-client';
import type { GlobalActionRunner, LoginResponse, TokenPairResponse } from '../../_lib/types';

export type UseAuthResult = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  challengeToken: string;
  accessToken: string;
  refreshToken: string;
  tokenReady: boolean;
  sessionInfo: string;
  opsInfo: string;
  error: string;
  loading: boolean;
  setOpsInfo: (value: string) => void;
  setError: (value: string) => void;
  clearOpsInfo: () => void;
  clearError: () => void;
  runGlobalAction: GlobalActionRunner;
  login: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  verifyMfa: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [opsInfo, setOpsInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokenReady = useMemo(() => accessToken.trim().length > 0, [accessToken]);

  const clearOpsInfo = useCallback(() => {
    setOpsInfo('');
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const runGlobalAction = useCallback<GlobalActionRunner>(async <T,>(action: () => Promise<T>) => {
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      return await action();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });
      setChallengeToken(data.challengeToken);
      setSessionInfo('ログイン成功。MFAコードを入力してください。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const verifyMfa = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeToken.trim() || !otp.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<TokenPairResponse>('/auth/mfa/verify', {
        challengeToken: challengeToken.trim(),
        otp: otp.trim(),
      });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setSessionInfo(`認証完了。Access Token有効期限: ${data.expiresIn}秒`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA検証に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [challengeToken, otp]);

  const refreshSession = useCallback(async () => {
    if (!refreshToken.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<TokenPairResponse>('/auth/refresh', {
        refreshToken: refreshToken.trim(),
      });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setSessionInfo(`トークン更新完了。Access Token有効期限: ${data.expiresIn}秒`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トークン更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  const logout = useCallback(async () => {
    if (!refreshToken.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      await postJson<{ success: boolean }>('/auth/logout', {
        refreshToken: refreshToken.trim(),
      });
      setAccessToken('');
      setRefreshToken('');
      setChallengeToken('');
      setOtp('');
      setOpsInfo('');
      setSessionInfo('ログアウトしました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtp,
    challengeToken,
    accessToken,
    refreshToken,
    tokenReady,
    sessionInfo,
    opsInfo,
    error,
    loading,
    setOpsInfo,
    setError,
    clearOpsInfo,
    clearError,
    runGlobalAction,
    login,
    verifyMfa,
    refreshSession,
    logout,
  };
}
