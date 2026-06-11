'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { validateLogin, type LoginErrors } from '../lib/auth';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

const initialValues = {
  identifier: '',
  password: '',
};

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLogin(values);
    setErrors(result.errors);
    if (!result.ok) {
      setStatus({ kind: 'idle' });
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      const user = await login(values);
      if (user.status === 'pending_review') {
        router.push('/pending-approval');
      } else {
        router.push('/');
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Login failed. Please try again.',
      });
    }
  }

  const submitting = status.kind === 'submitting';

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Sign in form">
      <div className={`field ${errors.identifier ? 'field--error' : ''}`}>
        <label htmlFor="login-identifier">Email, username, or phone</label>
        <input
          id="login-identifier"
          name="identifier"
          autoComplete="username"
          value={values.identifier}
          onChange={(event) => update('identifier', event.target.value)}
          aria-invalid={Boolean(errors.identifier)}
        />
        {errors.identifier ? (
          <span className="field__error">{errors.identifier}</span>
        ) : null}
      </div>

      <div className={`field ${errors.password ? 'field--error' : ''}`}>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? <span className="field__error">{errors.password}</span> : null}
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>

      <div aria-live="polite">
        {status.kind === 'error' ? (
          <p className="form__status form__status--error">{status.message}</p>
        ) : null}
      </div>
    </form>
  );
}
