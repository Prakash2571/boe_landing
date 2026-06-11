'use client';

import { useState, type FormEvent } from 'react';
import { validateLead, type LeadErrors } from '../lib/validation';
import { submitLead } from '../lib/onboarding';
import { interestOptions } from '../content/plans';

// Course/membership-interest capture. Framed as education interest, NOT
// onboarding for investment, KYC, account opening, or portfolio access.
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

const initialValues = {
  name: '',
  email: '',
  phone: '',
  interest: interestOptions[0],
  message: '',
};

export default function LeadForm() {
  const [values, setValues] = useState(initialValues);
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
      setValues(initialValues);
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'We could not submit your request. Please try again.',
      });
    }
  }

  const submitting = status.kind === 'submitting';

  return (
    <section className="section section--sunken" id="lead">
      <div className="container">
        <div className="lead">
          <div>
            <span className="eyebrow">Get learning details</span>
            <h2 className="section__title">Tell us what you want to learn</h2>
            <p className="section__lead">
              Share your details and we’ll send course and premium membership
              information. No pressure, just clear information to help you
              start learning.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate aria-label="Course interest form">
            <div className={`field ${errors.name ? 'field--error' : ''}`}>
              <label htmlFor="lead-name">Name</label>
              <input
                id="lead-name"
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={(e) => update('name', e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <span className="field__error">{errors.name}</span>
              ) : null}
            </div>

            <div className={`field ${errors.email ? 'field--error' : ''}`}>
              <label htmlFor="lead-email">Email</label>
              <input
                id="lead-email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? (
                <span className="field__error">{errors.email}</span>
              ) : null}
            </div>

            <div className={`field ${errors.phone ? 'field--error' : ''}`}>
              <label htmlFor="lead-phone">Phone number</label>
              <input
                id="lead-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(e) => update('phone', e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? (
                <span className="field__error">{errors.phone}</span>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="lead-interest">Interested course or plan</label>
              <select
                id="lead-interest"
                name="interest"
                value={values.interest}
                onChange={(e) => update('interest', e.target.value)}
              >
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="lead-message">Message (optional)</label>
              <textarea
                id="lead-message"
                name="message"
                rows={3}
                value={values.message}
                onChange={(e) => update('message', e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Request course details'}
            </button>

            <div aria-live="polite">
              {status.kind === 'success' ? (
                <p className="form__status form__status--success">
                  Thanks. We’ve received your request and will be in touch by
                  email.
                </p>
              ) : null}
              {status.kind === 'error' ? (
                <p className="form__status form__status--error">
                  {status.message}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
