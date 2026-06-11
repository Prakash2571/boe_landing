// Education-access tiers. CTAs are education-only: Start learning, Join
// premium, View plans - never invest/SIP/buy-fund/open-account language.

export type Plan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: readonly string[];
  cta: { label: string; href: string };
  featured?: boolean;
};

export const plans: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter course access',
    price: '₹499',
    cadence: 'one-time',
    tagline: 'Begin with a single course at your own pace.',
    features: [
      'Access to one course',
      'Lesson worksheets and templates',
      'Course completion certificate',
      'Email support',
    ],
    cta: { label: 'Start learning', href: '#lead' },
  },
  {
    id: 'premium',
    name: 'Premium membership',
    price: '₹299',
    cadence: 'per month',
    tagline: 'Ongoing learning, news briefings, and live sessions.',
    features: [
      'All courses included',
      'Daily & weekly news briefings',
      'Live Q&A sessions and webinars',
      'Templates, trackers, and worksheets',
      'Private learning community',
      'Early access to new courses',
    ],
    cta: { label: 'Join premium', href: '#lead' },
    featured: true,
  },
  {
    id: 'bundle',
    name: 'Complete learning bundle',
    price: '₹2,499',
    cadence: 'one-time',
    tagline: 'Every course plus a year of premium benefits.',
    features: [
      'Lifetime access to all courses',
      'One year of premium membership',
      'All certificates and worksheets',
      'Priority support',
      'Premium news briefings and explainers',
    ],
    cta: { label: 'View plans', href: '#lead' },
  },
] as const;

// Options surfaced in the lead-capture form (course/membership interest).
export const interestOptions: readonly string[] = [
  'Premium membership',
  'Complete learning bundle',
  'A specific course',
  'Just exploring',
] as const;
