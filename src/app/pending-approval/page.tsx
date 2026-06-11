'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleSignOut() {
    await logout();
    router.push('/login');
  }

  return (
    <main className="section" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '32rem' }}>
        <h1 className="section__title" style={{ marginBottom: '1rem' }}>
          Account Under Review
        </h1>
        <p className="section__lead" style={{ marginBottom: '2rem' }}>
          Thank you for signing up. Your account is currently pending admin approval.
          You will be notified via email once your account has been approved.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="btn btn--ghost"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
