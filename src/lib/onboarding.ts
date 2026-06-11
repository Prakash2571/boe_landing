// Lead submission to the existing backend onboarding endpoint.
// Contract: POST /v1/onboarding/applications with { name, email, phone }.
// The backend ignores unknown fields, so interest/message ride along safely
// for future use. Errors are intentionally NOT swallowed - the UI surfaces
// err.message to the user.

import { normalizeLead, type LeadInput, type NormalizedLead } from './validation';

// Same-origin endpoint. next.config.mjs rewrites /api/onboarding/* to the
// unchanged backend_controller /v1/onboarding/* endpoint server-side, so the
// browser never makes a cross-origin call and no CORS allowlist change is
// needed on the backend.
const ENDPOINT = '/api/onboarding/applications';

export type LeadResult = {
  id?: string;
  status?: string;
  [key: string]: unknown;
};

export async function submitLead(input: LeadInput): Promise<LeadResult> {
  const lead: NormalizedLead = normalizeLead(input);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      interest: lead.interest || undefined,
      message: lead.message || undefined,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: string } | null)?.message ||
      (payload as { error?: string } | null)?.error ||
      'We could not submit your request. Please try again.';
    throw new Error(message);
  }

  return (payload as LeadResult) ?? {};
}
