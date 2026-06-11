// Financial news feature: jargon-free briefings, framed strictly as education.
// Never trading signals or investment recommendations.

export type NewsDigest = { id: string; tag: string; title: string; summary: string };

export const newsTaglines: readonly string[] = [
  'Financial news, explained without jargon.',
  'Know what matters, not just what happened.',
  'Premium briefings for smarter money conversations.',
] as const;

export const newsDigests: readonly NewsDigest[] = [
  {
    id: 'economy-5',
    tag: 'Economy',
    title: 'Economy in 5 minutes',
    summary: 'The week’s big economic moves, summarised in plain language.',
  },
  {
    id: 'tax-updates',
    tag: 'Taxes',
    title: 'Tax updates explained',
    summary: 'What changed, who it affects, and what it means for everyday money.',
  },
  {
    id: 'credit-lending',
    tag: 'Credit',
    title: 'Credit & lending changes',
    summary: 'Shifts in borrowing, credit, and lending, decoded for real life.',
  },
  {
    id: 'budget-decoded',
    tag: 'Policy',
    title: 'Budget announcements decoded',
    summary: 'The headlines from major announcements, without the noise.',
  },
  {
    id: 'finance-reminders',
    tag: 'Habits',
    title: 'Personal finance reminders',
    summary: 'Timely rules and reminders to keep your money habits on track.',
  },
] as const;
