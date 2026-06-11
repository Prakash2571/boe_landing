// Navigation model. Sign in / Sign up create a LEARNER account (the gateway
// account), never described as an investment or brokerage account.

export type NavLink = { label: string; href: string };

export const navLinks: readonly NavLink[] = [
  { label: 'Courses', href: '/courses' },
  { label: 'Premium', href: '/premium' },
  { label: 'News', href: '/news' },
  { label: 'Plans', href: '/plans' },
  { label: 'About', href: '/about' },
];

export const authLinks = {
  signIn: { label: 'Sign in', href: '/login' },
  signUp: { label: 'Sign up', href: '/signup' },
} as const;

export const primaryCta = { label: 'Explore courses', href: '/courses' } as const;
export const secondaryCta = { label: 'View plans', href: '/plans' } as const;
