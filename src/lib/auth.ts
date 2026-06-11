const USER_STORAGE_KEY = 'beo.landing.user';
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MOBILE_DIGITS = 10;
const MIN_PASSWORD_LENGTH = 8;

export type LandingUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  username?: string | null;
  role?: string;
  status?: string;
};

export type SignupInput = {
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
};

export type NormalizedSignup = {
  name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

export type SignupErrors = Partial<Record<keyof NormalizedSignup, string>>;

export type LoginInput = {
  identifier?: string;
  password?: string;
};

export type LoginErrors = Partial<Record<keyof Required<LoginInput>, string>>;

type AuthPayload = {
  user?: LandingUser;
  accessToken?: string;
  refreshToken?: string;
};

type ApiEnvelope = {
  ok?: boolean;
  data?: AuthPayload;
  message?: string;
  error?: string;
  code?: string;
  details?: {
    errors?: string[];
  };
} & AuthPayload;

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function digitsOnly(value: unknown): string {
  return toText(value).replace(/[^0-9]/g, '');
}

function firstError(errors: Record<string, string>): string {
  return Object.values(errors)[0] || 'Please check the highlighted fields.';
}

async function readJson(response: Response): Promise<ApiEnvelope> {
  try {
    return (await response.json()) as ApiEnvelope;
  } catch {
    return { ok: false, message: 'The server returned an invalid response.' };
  }
}

function extractAuthPayload(payload: ApiEnvelope): AuthPayload {
  return payload.data || {
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

function errorMessage(payload: ApiEnvelope, fallback: string): string {
  return (
    payload.message ||
    payload.error ||
    payload.details?.errors?.[0] ||
    fallback
  );
}

async function postAuth(path: 'signup' | 'login' | 'logout', body: unknown): Promise<AuthPayload> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessage(payload, 'Authentication failed. Please try again.'));
  }

  return extractAuthPayload(payload);
}

export function normalizeSignup(input: SignupInput = {}): NormalizedSignup {
  return {
    name: toText(input.name).trim(),
    username: toText(input.username).trim().toLowerCase(),
    email: toText(input.email).trim().toLowerCase(),
    mobile: toText(input.mobile).trim(),
    password: toText(input.password),
    confirmPassword: toText(input.confirmPassword),
  };
}

export function validateSignup(input: SignupInput = {}): {
  ok: boolean;
  values: NormalizedSignup;
  errors: SignupErrors;
} {
  const values = normalizeSignup(input);
  const nameError = values.name ? undefined : 'Enter your name';
  const usernameError = USERNAME_PATTERN.test(values.username)
    ? undefined
    : 'Use 3-30 lowercase letters, numbers, or underscores';
  const emailError = EMAIL_PATTERN.test(values.email)
    ? undefined
    : 'Enter a valid email address';
  const mobileError = digitsOnly(values.mobile).length >= MIN_MOBILE_DIGITS
    ? undefined
    : 'Enter a valid mobile number';
  const passwordError = values.password.length >= MIN_PASSWORD_LENGTH
    ? undefined
    : 'Password must be at least 8 characters';
  const confirmPasswordError = values.password === values.confirmPassword
    ? undefined
    : 'Passwords do not match';

  const errors: SignupErrors = {
    ...(nameError ? { name: nameError } : {}),
    ...(usernameError ? { username: usernameError } : {}),
    ...(emailError ? { email: emailError } : {}),
    ...(mobileError ? { mobile: mobileError } : {}),
    ...(passwordError ? { password: passwordError } : {}),
    ...(confirmPasswordError ? { confirmPassword: confirmPasswordError } : {}),
  };

  return { ok: Object.keys(errors).length === 0, values, errors };
}

export function validateLogin(input: LoginInput = {}): {
  ok: boolean;
  values: Required<LoginInput>;
  errors: LoginErrors;
} {
  const values = {
    identifier: toText(input.identifier).trim(),
    password: toText(input.password),
  };
  const identifierError = values.identifier ? undefined : 'Enter your email, username, or phone';
  const passwordError = values.password ? undefined : 'Enter your password';
  const errors: LoginErrors = {
    ...(identifierError ? { identifier: identifierError } : {}),
    ...(passwordError ? { password: passwordError } : {}),
  };

  return { ok: Object.keys(errors).length === 0, values, errors };
}

export async function signup(input: SignupInput): Promise<LandingUser> {
  const result = validateSignup(input);
  if (!result.ok) throw new Error(firstError(result.errors));

  const payload = await postAuth('signup', {
    name: result.values.name,
    username: result.values.username,
    email: result.values.email,
    phone: result.values.mobile,
    password: result.values.password,
  });

  if (!payload.user) throw new Error('Signup succeeded without a user session.');
  return payload.user;
}

export async function login(input: LoginInput): Promise<LandingUser> {
  const result = validateLogin(input);
  if (!result.ok) throw new Error(firstError(result.errors));

  const payload = await postAuth('login', {
    identifier: result.values.identifier,
    password: result.values.password,
  });

  if (!payload.user) throw new Error('Login succeeded without a user session.');
  return payload.user;
}

export async function logout(): Promise<void> {
  await postAuth('logout', {});
}

export function storeUser(user: LandingUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredUser(): LandingUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as LandingUser;
    return user && typeof user.id === 'string' ? user : null;
  } catch {
    clearStoredUser();
    return null;
  }
}

export function isApprovedUser(user: LandingUser | null): boolean {
  return user?.status === 'approved';
}
