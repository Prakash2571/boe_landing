'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import {
  approveAccount,
  fetchAccounts,
  rejectAccount,
  type AdminCounts,
  type AdminUser,
} from '../lib/admin';

type Filter = 'all' | 'pending_review' | 'approved' | 'rejected';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  const [filter, setFilter] = useState<Filter>('pending_review');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [counts, setCounts] = useState<AdminCounts>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Gate the page: send non-admins away once auth state is known.
  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace('/login');
    } else if (!isAdmin) {
      router.replace('/');
    }
  }, [isReady, user, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const status = filter === 'all' ? undefined : filter;
      const result = await fetchAccounts(status);
      setItems(result.items);
      setCounts(result.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isReady && isAdmin) {
      load();
    }
  }, [isReady, isAdmin, load]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setError('');
    try {
      if (action === 'approve') {
        await approveAccount(id);
      } else {
        await rejectAccount(id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/login');
  }

  const summary = useMemo(
    () => [
      { label: 'Total accounts', value: counts.total ?? 0 },
      { label: 'Pending', value: counts.pending_review ?? 0 },
      { label: 'Approved', value: counts.approved ?? 0 },
      { label: 'Rejected', value: counts.rejected ?? 0 },
    ],
    [counts],
  );

  if (!isReady || !user || !isAdmin) {
    return (
      <main className="section" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p className="section__lead">Checking admin access…</p>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="admin__head">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="section__title">Account approvals</h1>
            <p className="section__lead">
              Review new learner accounts and approve or decline access.
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className="admin__stats">
          {summary.map((stat) => (
            <div key={stat.label} className="admin__stat card">
              <div className="admin__stat-value">{stat.value}</div>
              <div className="admin__stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="admin__filters">
          {FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin__filter ${filter === tab.key ? 'admin__filter--active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <button type="button" className="admin__refresh" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error ? <p className="form__status form__status--error">{error}</p> : null}

        <div className="admin__table-wrap card">
          {loading ? (
            <p className="admin__empty">Loading accounts…</p>
          ) : items.length === 0 ? (
            <p className="admin__empty">No accounts in this view.</p>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="admin__col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((account) => (
                  <tr key={account.id}>
                    <td data-label="Name">{account.name || '—'}</td>
                    <td data-label="Email">{account.email || '—'}</td>
                    <td data-label="Username">{account.username || '—'}</td>
                    <td data-label="Phone">{account.phone || '—'}</td>
                    <td data-label="Joined">{formatDate(account.createdAt)}</td>
                    <td data-label="Status">
                      <span className={`admin__badge admin__badge--${account.status}`}>
                        {STATUS_LABEL[account.status || ''] || account.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="admin__col-actions">
                      <div className="admin__actions">
                        <button
                          type="button"
                          className="btn btn--primary admin__btn"
                          disabled={busyId === account.id || account.status === 'approved'}
                          onClick={() => handleAction(account.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost admin__btn"
                          disabled={busyId === account.id || account.status === 'rejected'}
                          onClick={() => handleAction(account.id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
