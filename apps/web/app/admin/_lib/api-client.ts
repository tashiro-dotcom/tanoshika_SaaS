import { getFilenameFromContentDisposition } from './helpers';
import { type ApiErrorPayload } from './types';

const apiErrorCodeMessages: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません。',
  mfa_not_configured: 'MFAが未設定のアカウントです。管理者へ連絡してください。',
  invalid_otp: 'MFAコードが正しくありません。最新コードを再入力してください。',
  invalid_challenge_type: 'MFAチャレンジが不正です。ログインからやり直してください。',
  challenge_invalid_or_expired: 'MFAチャレンジの有効期限が切れました。ログインからやり直してください。',
  unauthorized: '認証に失敗しました。ログイン状態を確認してください。',
  forbidden: 'この操作を実行する権限がありません。',
  organization_forbidden: '他組織データへのアクセスは許可されていません。',
  service_user_not_found: '対象の利用者が見つかりません。',
  attendance_not_found: '対象の勤怠データが見つかりません。',
  not_found: '対象データが見つかりません。',
  invalid_date_range: '日付範囲が不正です（from は to 以下にしてください）。',
  open_clock_in_not_found: '未退勤の出勤打刻が見つかりません。',
  validation_error: '入力値が不正です。必須項目と形式を確認してください。',
  change_reason_required: 'ルール変更理由を入力してください。',
  reviewer_must_differ: '申請者本人は承認できません。別ユーザーで承認してください。',
  request_not_pending: 'この申請は承認可能な状態ではありません。',
  review_comment_required: '却下理由を入力してください。',
};

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function resolveApiErrorMessage(status: number, text: string): string {
  try {
    const payload = JSON.parse(text) as ApiErrorPayload;
    if (payload.code && apiErrorCodeMessages[payload.code]) {
      return apiErrorCodeMessages[payload.code];
    }
    if (typeof payload.message === 'string' && apiErrorCodeMessages[payload.message]) {
      return apiErrorCodeMessages[payload.message];
    }
    if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
      return payload.message;
    }
    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(', ');
    }
  } catch {
    // noop
  }

  if (status === 401 && text.toLowerCase().includes('jwt')) {
    return '認証トークンの有効期限が切れています。再ログインしてください。';
  }

  return `API呼び出しに失敗しました（HTTP ${status}）`;
}

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
}

async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  const text = await res.text();
  throw new ApiError(res.status, text, resolveApiErrorMessage(res.status, text));
}

export async function fetchJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  const ok = await ensureOk(res);
  return (await ok.json()) as T;
}

export async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('POST', path, body, token);
}

export async function patchJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('PATCH', path, body, token);
}

export async function sendJson<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const ok = await ensureOk(res);
  return (await ok.json()) as T;
}

export async function downloadAuthenticatedFile(path: string, token: string, fallback: string): Promise<string> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const ok = await ensureOk(res);
  const blob = await ok.blob();
  const filename = getFilenameFromContentDisposition(ok.headers.get('content-disposition'), fallback);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}
