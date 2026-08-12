import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercises the route handler against a stubbed app backend. The value here is
// the two things unit-testing signup.ts cannot cover: that the shared secret is
// actually attached to the upstream call, and that each upstream failure becomes
// a response a visitor can act on rather than a raw 500.

const API_BASE = 'https://app.test/api';
const SECRET = 'test-secret-0123456789012345678901234567';

let fetchMock: ReturnType<typeof vi.fn>;

function upstream(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function request(body: unknown): Request {
  return new Request('https://beonedge.in/api/newuser', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validForm = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '9876543210',
  password: 'analytical-engine-1843',
  confirmPassword: 'analytical-engine-1843',
  acceptedConsents: true,
};

// The handler reads env through serverEnv at call time, so setting it here is
// enough — no module cache juggling needed.
beforeEach(() => {
  process.env.BEO_API_BASE = API_BASE;
  process.env.NEWUSER_SHARED_SECRET = SECRET;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.BEO_API_BASE;
  delete process.env.NEWUSER_SHARED_SECRET;
});

async function post(body: unknown) {
  const { POST } = await import('./route');
  // NextRequest is structurally a Request for what this handler touches.
  const response = await POST(request(body) as never);
  return { status: response.status, payload: await response.json() };
}

describe('POST /api/newuser', () => {
  it('forwards to {BEO_API_BASE}/newuser with the shared secret and a normalised body', async () => {
    fetchMock.mockResolvedValue(upstream(202, { ok: true, data: { accepted: true } }));

    const { status, payload } = await post(validForm);

    expect(status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/newuser`);
    expect(init.method).toBe('POST');
    expect(init.headers['x-signup-key']).toBe(SECRET);
    // The phone reaches the app as E.164 even though the form sent 10 digits,
    // and confirmPassword is dropped: it is a browser-side typo guard, and the
    // upstream schema is strict, so forwarding it would be rejected outright.
    expect(JSON.parse(init.body)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+919876543210',
      password: 'analytical-engine-1843',
      acceptedConsents: true,
    });
  });

  it('accepts the exact body the form posts, which carries no confirmPassword', async () => {
    // Regression: SignupForm sends validateSignup().values, and those deliberately
    // exclude confirmPassword. The handler re-validates that body, so treating the
    // absent re-entry as an empty string made every real browser signup fail with
    // "Both passwords must match" while hand-written JSON that included the field
    // still passed — which is how this got past a curl-based check.
    fetchMock.mockResolvedValue(upstream(202, { ok: true, data: { accepted: true } }));

    const { confirmPassword, ...asPostedByTheForm } = validForm;
    const { status, payload } = await post(asPostedByTheForm);

    expect(status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(payload.fields).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a mismatched password re-entry locally, without calling the app', async () => {
    const { status, payload } = await post({ ...validForm, confirmPassword: 'something-else-99' });

    expect(status).toBe(400);
    expect(payload.fields.confirmPassword).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a too-short password locally, without calling the app', async () => {
    const { status, payload } = await post({ ...validForm, password: 'short', confirmPassword: 'short' });

    expect(status).toBe(400);
    expect(payload.fields.password).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never echoes the password back to the browser', async () => {
    fetchMock.mockResolvedValue(
      upstream(400, {
        ok: false,
        error: { code: 'VALIDATION_FAILED', details: { fields: { email: ['is already in use'] } } },
      }),
    );

    const { payload } = await post(validForm);

    expect(JSON.stringify(payload)).not.toContain('analytical-engine-1843');
  });

  it('rejects an unaccepted consent locally, without calling the app', async () => {
    const { status, payload } = await post({ ...validForm, acceptedConsents: false });

    expect(status).toBe(400);
    expect(payload.fields.acceptedConsents).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed phone locally, without calling the app', async () => {
    const { status } = await post({ ...validForm, phone: '123' });
    expect(status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the app field errors when it validates something we did not', async () => {
    fetchMock.mockResolvedValue(
      upstream(400, {
        ok: false,
        error: { code: 'VALIDATION_FAILED', details: { fields: { email: ['is already in use'] } } },
      }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(400);
    expect(payload.fields.email).toBe('is already in use');
  });

  it('maps a rate limit to 429 with retry wording', async () => {
    fetchMock.mockResolvedValue(upstream(429, { ok: false, error: { code: 'RATE_LIMITED' } }));

    const { status, payload } = await post(validForm);

    expect(status).toBe(429);
    expect(payload.message).toMatch(/try again/i);
  });

  it('never tells a visitor that OUR key was rejected', async () => {
    fetchMock.mockResolvedValue(
      upstream(401, { ok: false, error: { code: 'AUTHENTICATION_REQUIRED' } }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(502);
    // A misconfigured deployment is our fault; say nothing that leaks it.
    expect(payload.message).not.toMatch(/key|secret|auth/i);
    expect(console.error).toHaveBeenCalled();
  });

  it('turns an unreachable backend into 503, not a crash', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const { status, payload } = await post(validForm);

    expect(status).toBe(503);
    expect(payload.ok).toBe(false);
  });

  it('turns a backend timeout into a retryable 504, not a silent hang', async () => {
    // What AbortSignal.timeout actually rejects with: an error whose name is
    // 'TimeoutError'. Without the upstream signal this fetch would hang until
    // nginx's 30s proxy_read_timeout cut in with a bare HTML page the form
    // cannot parse — the half-minute "Submitting..." freeze this prevents.
    fetchMock.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));

    const { status, payload } = await post(validForm);

    expect(status).toBe(504);
    expect(payload.ok).toBe(false);
    expect(payload.message).toMatch(/try again/i);
    // Not a field problem: the visitor retries, they do not edit what they typed.
    expect(payload.fields).toBeUndefined();
  });

  it('answers 5 parallel signups independently, with no shared state', async () => {
    // Parallel signups from one office NAT are the production scenario: the
    // handler must process them concurrently, not serialise them. Each upstream
    // call resolves after a small random delay, so any accidental shared-state
    // serialisation would show up as missing or mixed-up responses here.
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) =>
          setTimeout(
            () => resolve(upstream(202, { ok: true, data: { accepted: true } })),
            Math.random() * 50,
          ),
        ),
    );

    const results = await Promise.all(
      Array.from({ length: 5 }, () => post(validForm)),
    );

    for (const { status, payload } of results) {
      expect(status).toBe(202);
      expect(payload.ok).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('reports a dependency outage as a retryable 503, not a permanent failure', async () => {
    fetchMock.mockResolvedValue(
      upstream(503, { ok: false, error: { code: 'DEPENDENCY_UNAVAILABLE' } }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.message).toMatch(/try again/i);
    // Not a field problem: the visitor is not sent back to change what they typed.
    expect(payload.fields).toBeUndefined();
  });

  it('surfaces a breached password as a field error the visitor can act on', async () => {
    // The real envelope shape: detail sits directly on error.fields. Reading it
    // from error.details.fields matched nothing, so every upstream field error was
    // dropped and the form showed "check the highlighted fields" with nothing
    // highlighted — the exact dead end reported from production.
    fetchMock.mockResolvedValue(
      upstream(400, {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          fields: { password: ['this password appeared in a data breach; choose another'] },
        },
      }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(400);
    expect(payload.fields.password).toMatch(/data breach/i);
    expect(payload.message).toMatch(/highlighted/i);
  });

  it('also accepts detail nested under error.details.fields', async () => {
    fetchMock.mockResolvedValue(
      upstream(400, {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          details: { fields: { email: ['is already in use'] } },
        },
      }),
    );

    const { payload } = await post(validForm);

    expect(payload.fields.email).toMatch(/already in use/i);
  });

  it('never says "highlighted fields" when nothing can be highlighted', async () => {
    // `_root` is a whole-body complaint, not an input, so it must not be passed
    // through as a field error — there is no such box to mark.
    fetchMock.mockResolvedValue(
      upstream(400, {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          fields: { _root: ['Unrecognized key: "confirmPassword"'] },
        },
      }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(400);
    expect(payload.fields).toBeUndefined();
    expect(payload.message).not.toMatch(/highlighted/i);
    expect(payload.message).toMatch(/try again|contact support/i);
  });

  it('never says "highlighted fields" when the app sends no detail at all', async () => {
    fetchMock.mockResolvedValue(
      upstream(400, { ok: false, error: { code: 'VALIDATION_FAILED' } }),
    );

    const { payload } = await post(validForm);

    expect(payload.fields).toBeUndefined();
    expect(payload.message).not.toMatch(/highlighted/i);
  });

  it('does not claim an email was sent when the app replayed a stored answer', async () => {
    // An idempotency replay creates nothing and sends nothing. Telling the visitor
    // to check their inbox leaves them waiting for mail that will never arrive,
    // with no application in the review queue either.
    fetchMock.mockResolvedValue(
      upstream(202, {
        ok: true,
        data: { accepted: true },
        meta: { idempotencyReplay: true },
      }),
    );

    const { status, payload } = await post(validForm);

    expect(status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(payload.message).not.toMatch(/we have sent you a link/i);
    expect(payload.message).toMatch(/already have an application/i);
    expect(payload.message).toMatch(/24 hours/i);
  });

  it('still promises the email on a genuine first acceptance', async () => {
    fetchMock.mockResolvedValue(
      upstream(202, { ok: true, data: { accepted: true }, meta: {} }),
    );

    const { payload } = await post(validForm);

    expect(payload.message).toMatch(/we have sent you a link/i);
  });
});
