'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Keeps already-authenticated users off the /login and /signup pages. A user
// who just signed up (and is therefore signed in but pending review) is sent
// to the pending-approval screen instead of seeing the login form again.
export default function RedirectIfAuthed() {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || !user) return;
    if (user.role === 'admin') {
      router.replace('/admin');
    } else if (user.status === 'approved') {
      router.replace('/');
    } else {
      router.replace('/pending-approval');
    }
  }, [isReady, user, router]);

  return null;
}
