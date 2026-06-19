// Client helpers for the admin dashboard. Talk to the same-origin /api/admin
// proxy routes, which forward the admin's httpOnly cookie to the backend.

export type AdminUser = {
  id: string;
  name?: string;
  firstName?: string;
  username?: string | null;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt?: string;
};

export type AdminCounts = {
  total: number;
  pending_review?: number;
  approved?: number;
  rejected?: number;
  [key: string]: number | undefined;
};

type AdminListResponse = {
  ok?: boolean;
  items?: AdminUser[];
  counts?: AdminCounts;
  error?: string;
};

async function readJson(response: Response): Promise<AdminListResponse> {
  try {
    return (await response.json()) as AdminListResponse;
  } catch {
    return { ok: false, error: 'The server returned an invalid response.' };
  }
}

export async function fetchAccounts(status?: string): Promise<{
  items: AdminUser[];
  counts: AdminCounts;
}> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`/api/admin/users${query}`, { cache: 'no-store' });
  const payload = await readJson(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Unable to load accounts.');
  }

  return {
    items: payload.items || [],
    counts: payload.counts || { total: 0 },
  };
}

async function postAction(id: string, action: 'approve' | 'reject'): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const payload = await readJson(response);
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Could not ${action} this account.`);
  }
}

export function approveAccount(id: string): Promise<void> {
  return postAction(id, 'approve');
}

export function rejectAccount(id: string): Promise<void> {
  return postAction(id, 'reject');
}
