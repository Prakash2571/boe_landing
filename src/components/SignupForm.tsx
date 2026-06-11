'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { validateSignup, type SignupErrors } from '../lib/auth';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

const initialValues = {
  name: '',
  username: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
};

export default function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function update<K extends keyof typeof values>(key: K, value: string) {
    const nextValue = key === 'username' ? value.toLowerCase() : value;
    setValues((prev) => ({ ...prev, [key]: nextValue }));
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
      const user = await signup(values);
      if (user.status === 'pending_review') {
        router.push('/pending-approval');
      } else {
        router.push('/');
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Signup failed. Please try again.',
      });
    }
  }

  const submitting = status.kind === 'submitting';

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Create account form">
      <div className={`field ${errors.name ? 'field--error' : ''}`}>
        <label htmlFor="signup-name">Name</label>
        <input
          id="signup-name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <span className="field__error">{errors.name}</span> : null}
      </div>

      <div className={`field ${errors.username ? 'field--error' : ''}`}>
        <label htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          name="username"
          autoComplete="username"
          value={values.username}
          onChange={(event) => update('username', event.target.value)}
          aria-invalid={Boolean(errors.username)}
        />
        {errors.username ? <span className="field__error">{errors.username}</span> : null}
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
        />
        {errors.email ? <span className="field__error">{errors.email}</span> : null}
      </div>

      <div className={`field ${errors.mobile ? 'field--error' : ''}`}>
        <label htmlFor="signup-mobile">Mobile</label>
        <input
          id="signup-mobile"
          name="mobile"
          type="tel"
          autoComplete="tel"
          value={values.mobile}
          onChange={(event) => update('mobile', event.target.value)}
          aria-invalid={Boolean(errors.mobile)}
        />
        {errors.mobile ? <span className="field__error">{errors.mobile}</span> : null}
      </div>

      <div className={`field ${errors.password ? 'field--error' : ''}`}>
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(event) => update('password', event.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? <span className="field__error">{errors.password}</span> : null}
      </div>

      <div className={`field ${errors.confirmPassword ? 'field--error' : ''}`}>
        <label htmlFor="signup-confirm-password">Confirm password</label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          aria-invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword ? (
          <span className="field__error">{errors.confirmPassword}</span>
        ) : null}
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create account'}
      </button>

      <div aria-live="polite">
        {status.kind === 'error' ? (
          <p className="form__status form__status--error">{status.message}</p>
        ) : null}
      </div>
    </form>
  );
}
