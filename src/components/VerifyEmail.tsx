'use client';

import { useEffect, useRef, useState } from 'react';

// The page the signup email links to. The app backend builds
// `${PUBLIC_LANDING_ORIGIN}/verify-email?token=…`, so this site owns the landing
// spot and hands the token to our own /api route, which redeems it server-side.

type State =
  | { kind: 'verifying' }
  | { kind: 'confirmed'; message: string }
  | { kind: 'already'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'retry'; message: string };

type ApiResponse = {
  ok?: boolean;
  message?: string;
  state?: 'used' | 'expired' | 'invalid';
};

export default function VerifyEmail({ token }: { token: string | null }) {
  const [state, setState] = useState<State>(
    token ? { kind: 'verifying' } : { kind: 'invalid', message: 'This link is missing its confirmation code.' },
  );

  // React 18 Strict Mode mounts effects twice in development. The token is
  // single-use, so a second redeem would answer TOKEN_ALREADY_USED and show a
  // misleading "already used" message on a genuinely first visit.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    let active = true;

    (async () => {
      try {
        const response = await fetch('/api/newuser/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        let payload: ApiResponse = {};
        try {
          payload = (await response.json()) as ApiResponse;
        } catch {
          payload = {};
        }
        if (!active) return;

        if (payload.ok) {
          setState({ kind: 'confirmed', message: payload.message || 'Your email is confirmed.' });
          return;
        }

        const message = payload.message || 'We could not confirm your email.';
        if (payload.state === 'used') setState({ kind: 'already', message });
        else if (payload.state === 'expired') setState({ kind: 'expired', message });
        else if (payload.state === 'invalid') setState({ kind: 'invalid', message });
        else setState({ kind: 'retry', message });
      } catch {
        if (!active) return;
        setState({
          kind: 'retry',
          message: 'We could not reach our servers. Please check your connection and try again.',
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (state.kind === 'verifying') {
    return (
      <p className="form__status" role="status" aria-live="polite">
        Confirming your email…
      </p>
    );
  }

  const isGood = state.kind === 'confirmed' || state.kind === 'already';

  return (
    <div role="status" aria-live="polite">
      <p className={`form__status ${isGood ? 'form__status--success' : 'form__status--error'}`}>
        {state.message}
      </p>

      {isGood ? (
        <p className="form__hint">
          Our team reviews every application. You will get an email with next steps once your
          account is approved — nothing else is needed from you right now.
        </p>
      ) : null}

      {state.kind === 'expired' || state.kind === 'invalid' ? (
        <p className="form__hint">
          <a href="/signup">Sign up again</a> to get a fresh confirmation link.
        </p>
      ) : null}

      {state.kind === 'retry' ? (
        <p className="form__hint">
          Reload this page to try again, or <a href="/contact">contact us</a> if it keeps failing.
        </p>
      ) : null}
    </div>
  );
}
