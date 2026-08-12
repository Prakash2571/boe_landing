'use client';

import { useState, type FormEvent } from 'react';

import { validateSignup, type SignupErrors } from '../lib/signup';

// What signup means now: this form collects the password the person will sign in
// to the BeOnEdge app with. It does NOT create a session here — there is nothing
// on this site to log into. It registers an application with the app backend,
// and queues the person directly for admin review. Once an admin approves them,
// their account opens with this same password, so the
// password is chosen here rather than issued later.

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const initialValues = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedConsents: false,
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
};

export default function SignupForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  function update<K extends keyof typeof values>(key: K, value: typeof values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateSignup(values);
    setErrors(result.errors);
    if (!result.ok) {
      setStatus({ kind: 'idle' });
      return;
    }

    setStatus({ kind: 'submitting' });
    setSlowHint(false);
    // Parallel signups can keep the backend busy for many seconds, and the
    // button label alone ('Submitting...') looks frozen after a while. Show a
    // "still working" note if nothing has resolved within ~8 seconds; the timer
    // is cleared in finally so it can never fire after the status has moved on.
    const slowTimer = setTimeout(() => setSlowHint(true), 8_000);
    try {
      const response = await fetch('/api/newuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the normalised values, not the raw ones: the phone the visitor
        // typed becomes E.164 here, which is the only form the app accepts.
        body: JSON.stringify(result.values),
        // Client-side safety net: the server gives up at ~20s, but if anything
        // in between (nginx, a hung socket) keeps the request open past 45s the
        // visitor would otherwise wait forever. This rejects with a
        // TimeoutError, handled in the catch below.
        signal: AbortSignal.timeout(45_000),
      });

      let payload: ApiResponse = {};
      try {
        payload = (await response.json()) as ApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        // Re-surface per-field messages from the server when it sent them, so a
        // rule the browser did not catch still lands on the right input.
        if (payload.fields) setErrors(payload.fields as SignupErrors);
        // When the payload has no message — e.g. nginx answered with an HTML
        // error page, which fails JSON parsing above — translate the statuses
        // with a clear, actionable meaning instead of the generic fallback.
        // 429 = rate-limited for a minute; 503/504 = the signup service is
        // overloaded or timed out. Server-sent messages always win.
        let fallback = 'We could not complete your signup. Please try again.';
        if (response.status === 429) {
          fallback = 'Too many signup attempts just now. Please wait a minute and try again.';
        } else if (response.status === 503 || response.status === 504) {
          fallback = 'Our signup service is busy right now. Please try again in a moment.';
        }
        setStatus({ kind: 'error', message: payload.message || fallback });
        return;
      }

      setValues(initialValues);
      setErrors({});
      setShowPasswords(false);
      setStatus({
        kind: 'done',
        message: payload.message || 'Your application has been submitted for review.',
      });
    } catch (error) {
      // AbortSignal.timeout rejects with a TimeoutError ('AbortError' in older
      // engines): that is our 45s safety net, not a connectivity problem, so
      // it deserves its own message rather than the network-failure one.
      const timedOut =
        error instanceof DOMException &&
        (error.name === 'TimeoutError' || error.name === 'AbortError');
      setStatus({
        kind: 'error',
        message: timedOut
          ? 'This is taking unusually long. Please try again in a moment.'
          : 'We could not reach our servers. Please check your connection and try again.',
      });
    } finally {
      clearTimeout(slowTimer);
      setSlowHint(false);
    }
  }

  const submitting = status.kind === 'submitting';

  // On success the form is replaced entirely. Leaving the fields on screen
  // invites a second submission of details that are already registered — and
  // leaves a password sitting in a DOM input for no reason.
  if (status.kind === 'done') {
    return (
      <div className="form__done" role="status" aria-live="polite">
        <p className="form__status form__status--success">{status.message}</p>
        <p className="form__hint">
          Our team will email you with the decision. If approved, the email includes the official
          BeOnEdge app download link. Sign in with the email address and password you just chose.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Create account form">
      <div className={`field ${errors.fullName ? 'field--error' : ''}`}>
        <label htmlFor="signup-full-name">Full name</label>
        <input
          id="signup-full-name"
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(event) => update('fullName', event.target.value)}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'signup-full-name-error' : undefined}
        />
        {errors.fullName ? (
          <span className="field__error" id="signup-full-name-error">{errors.fullName}</span>
        ) : null}
      </div>

      <div className={`field ${errors.email ? 'field--error' : ''}`}>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
        />
        {errors.email ? (
          <span className="field__error" id="signup-email-error">{errors.email}</span>
        ) : null}
      </div>

      <div className={`field ${errors.phone ? 'field--error' : ''}`}>
        <label htmlFor="signup-phone">Mobile number</label>
        <input
          id="signup-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={values.phone}
          onChange={(event) => update('phone', event.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'signup-phone-error' : 'signup-phone-hint'}
        />
        {errors.phone ? (
          <span className="field__error" id="signup-phone-error">{errors.phone}</span>
        ) : (
          <span className="field__hint" id="signup-phone-hint">
            Indian numbers work without the country code.
          </span>
        )}
      </div>

      {/*
        autoComplete="new-password" on both, so a password manager offers to
        generate and store one instead of filling an existing credential.
      */}
      <div className={`field ${errors.password ? 'field--error' : ''}`}>
        <label htmlFor="signup-password">Create password</label>
        <input
          id="signup-password"
          name="password"
          type={showPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
        />
        {errors.password ? (
          <span className="field__error" id="signup-password-error">{errors.password}</span>
        ) : (
          <span className="field__hint" id="signup-password-hint">
            At least 12 characters. You will use this to sign in to the app once your
            account is approved.
          </span>
        )}
      </div>

      <div className={`field ${errors.confirmPassword ? 'field--error' : ''}`}>
        <label htmlFor="signup-confirm-password">Re-enter password</label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type={showPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={128}
          value={values.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
        />
        {errors.confirmPassword ? (
          <span className="field__error" id="signup-confirm-password-error">
            {errors.confirmPassword}
          </span>
        ) : null}
      </div>

      {/*
        A reveal toggle rather than a strength meter. It lets someone check what
        they typed, which is the actual cause of a mismatched re-entry; a meter
        would only restate the length rule already shown above.
      */}
      <div className="field field--consent">
        <label className="consent" htmlFor="signup-show-passwords">
          <input
            id="signup-show-passwords"
            type="checkbox"
            checked={showPasswords}
            onChange={(event) => setShowPasswords(event.target.checked)}
          />
          <span>Show passwords</span>
        </label>
      </div>

      <div className={`field field--consent ${errors.acceptedConsents ? 'field--error' : ''}`}>
        <label className="consent" htmlFor="signup-consents">
          <input
            id="signup-consents"
            name="acceptedConsents"
            type="checkbox"
            checked={values.acceptedConsents}
            onChange={(event) => update('acceptedConsents', event.target.checked)}
            aria-invalid={Boolean(errors.acceptedConsents)}
            aria-describedby={errors.acceptedConsents ? 'signup-consents-error' : undefined}
          />
          <span>
            I have read and accept the <a href="/terms">Terms of Use</a> and the{' '}
            <a href="/privacy">Privacy Policy</a>.
          </span>
        </label>
        {errors.acceptedConsents ? (
          <span className="field__error" id="signup-consents-error">{errors.acceptedConsents}</span>
        ) : null}
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Create account'}
      </button>

      <div aria-live="polite">
        {status.kind === 'error' ? (
          <p className="form__status form__status--error">{status.message}</p>
        ) : null}
        {submitting && slowHint ? (
          <p className="form__hint">
            Still working — this is taking longer than usual. Please keep this tab open.
          </p>
        ) : null}
      </div>
    </form>
  );
}
