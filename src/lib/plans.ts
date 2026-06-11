export type Plan = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pricePaise: number;
  cadence: string;
  features: string[];
  ctaLabel: string;
  featured?: boolean;
  status: string;
  sortOrder: number;
  createdAt: string;
};

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch('/api/plans', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load plans');
  const data = await res.json();
  return data.items || [];
}
