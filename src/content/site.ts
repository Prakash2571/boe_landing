// Brand-level strings for the finance EDUCATION surface.
// This surface is education-only by company policy: no investing, SIP,
// portfolio, or account-opening language anywhere. See plan step-11.

export const site = {
  name: 'BeOnEdge',
  // Short, education-positioned descriptor used in nav + footer.
  descriptor: 'Financial education, made clear.',
  longDescriptor:
    'Practical finance courses and premium money insights that help you understand income, budgeting, saving, debt, credit, taxes, and everyday money decisions.',
  contactEmail: 'learn@beonedge.in',
  // Mandatory educational disclaimer (footer + money/news copy).
  disclaimer:
    'Content is for financial education and general awareness only. It does not constitute financial, legal, tax, or investment advice.',
} as const;

export type Site = typeof site;
