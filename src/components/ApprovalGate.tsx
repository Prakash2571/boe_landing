'use client';

import { useAuth } from './AuthProvider';

export function ApprovalGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return null;
  if (user && user.status !== 'approved') {
    return fallback || (
      <div className="approval-gate">
        <p>Your account is pending admin approval. You will be notified once approved.</p>
      </div>
    );
  }
  return <>{children}</>;
}
