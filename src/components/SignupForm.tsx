'use client';

import { useState, type FormEvent } from 'react';

import { validateSignup, type SignupErrors } from '../lib/signup';

// What signup means now: this form does NOT create a session or a password. It
// registers an application with the BeOnEdge app backend, which emails a
// confirmation link and then queues the person for admin review. Credentials are
// issued later, inside the client app, once an admin approves them. So there is
// nothing to log into here and nothing to redirect to.

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const initialValues = {
  fullName: '',
  email: '',
  phone: '',
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
    try {
      const response = await fetch('/api/newuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the normalised values, not the raw ones: the phone the visitor
        // typed becomes E.164 here, which is the only form the app accepts.
        body: JSON.stringify(result.values),
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
        setStatus({
          kind: 'error',
          message: payload.message || 'We could not complete your signup. Please try again.',
        });
        return;
      }

      setValues(initialValues);
      setErrors({});
      setStatus({
        kind: 'done',
        message: payload.message || 'Check your email to confirm your address.',
      });
    } catch {
      setStatus({
        kind: 'error',
        message: 'We could not reach our servers. Please check your connection and try again.',
      });
    }
  }

  const submitting = status.kind === 'submitting';

  // On success the form is replaced entirely. Leaving the fields on screen
  // invites a second submission of details that are already registered.
  if (status.kind === 'done') {
    return (
      <div className="form__done" role="status" aria-live="polite">
        <p className="form__status form__status--success">{status.message}</p>
        <p className="form__hint">
          The link is valid for 24 hours. Once you confirm, our team reviews your application and
          emails you when your account is ready.
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
      </div>
    </form>
  );
}
