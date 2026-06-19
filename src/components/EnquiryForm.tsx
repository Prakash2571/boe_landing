'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { validateLead, type LeadErrors } from '../lib/validation';
import { submitLead } from '../lib/onboarding';

// Enquiry capture tied to a specific course or plan. The item name is passed in
// via the `interest` query param (e.g. /enquiry?interest=Money%20Basics) and
// pre-fills the form. Framed as an education enquiry — not account opening,
// KYC, or any investment onboarding.
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function EnquiryForm() {
  const params = useSearchParams();
  const presetInterest = params.get('interest') || '';

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    interest: presetInterest,
    message: '',
  });
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLead(values);
    setErrors(result.errors);
    if (!result.ok) {
      setStatus({ kind: 'idle' });
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      await submitLead(values);
      setStatus({ kind: 'success' });
      setValues((prev) => ({ ...prev, name: '', email: '', phone: '', message: '' }));
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof Error ? err.message : 'We could not submit your enquiry. Please try again.',
      });
    }
  }

  const submitting = status.kind === 'submitting';

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Course or plan enquiry form">
      <div className="field">
        <label htmlFor="enquiry-interest">I&apos;m interested in</label>
        <input
          id="enquiry-interest"
          name="interest"
          placeholder="e.g. a specific course or plan"
          value={values.interest}
          onChange={(e) => update('interest', e.target.value)}
          readOnly={Boolean(presetInterest)}
          aria-readonly={Boolean(presetInterest)}
          style={presetInterest ? { cursor: 'default', opacity: 0.85 } : undefined}
        />
      </div>

      <div className={`field ${errors.name ? 'field--error' : ''}`}>
        <label htmlFor="enquiry-name">Name</label>
        <input
          id="enquiry-name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <span className="field__error">{errors.name}</span> : null}
      </div>

      <div className={`field ${errors.email ? 'field--error' : ''}`}>
        <label htmlFor="enquiry-email">Email</label>
        <input
          id="enquiry-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? <span className="field__error">{errors.email}</span> : null}
      </div>

      <div className={`field ${errors.phone ? 'field--error' : ''}`}>
        <label htmlFor="enquiry-phone">Phone number</label>
        <input
          id="enquiry-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => update('phone', e.target.value)}
          aria-invalid={Boolean(errors.phone)}
        />
        {errors.phone ? <span className="field__error">{errors.phone}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="enquiry-message">Message (optional)</label>
        <textarea
          id="enquiry-message"
          name="message"
          rows={3}
          placeholder="Anything you'd like us to know?"
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>

      <div aria-live="polite">
        {status.kind === 'success' ? (
          <p className="form__status form__status--success">
            Thanks. We&apos;ve received your enquiry and will get back to you by email.
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p className="form__status form__status--error">{status.message}</p>
        ) : null}
      </div>
    </form>
  );
}
