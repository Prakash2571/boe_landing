// Navigation model. This site does not sign anyone in: the only account action
// here is applying for access, which the app backend then verifies and an admin
// approves. Sign-in lives in the client app, not on the marketing site.

export type NavLink = { label: string; href: string };

export const navLinks: readonly NavLink[] = [
  { label: 'Courses', href: '/courses' },
  { label: 'Premium', href: '/premium' },
  { label: 'News', href: '/news' },
  { label: 'Plans', href: '/plans' },
  { label: 'Contact Us', href: '/contact' },
];

export const authLinks = {
  signUp: { label: 'Sign up', href: '/signup' },
} as const;

export const primaryCta = { label: 'Explore courses', href: '/courses' } as const;
export const secondaryCta = { label: 'View plans', href: '/plans' } as const;
