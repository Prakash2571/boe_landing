// Course catalog. Framed around education, behavior, systems, and decision
// clarity - never investment products or fund listings.

export type SkillLevel = 'Beginner' | 'Intermediate' | 'All levels';

export type Course = {
  id: string;
  name: string;
  level: SkillLevel;
  format: string;
  outcome: string;
};

export const courses: readonly Course[] = [
  {
    id: 'money-basics',
    name: 'Money Basics',
    level: 'Beginner',
    format: '6 lessons · self-paced',
    outcome: 'Understand how income, expenses, and cash flow actually work day to day.',
  },
  {
    id: 'budgeting-systems',
    name: 'Budgeting & Expense Systems',
    level: 'Beginner',
    format: '8 lessons · with worksheets',
    outcome: 'Set up a budgeting system you can keep, and track spending without friction.',
  },
  {
    id: 'saving-emergency',
    name: 'Saving & Emergency Planning',
    level: 'Beginner',
    format: '5 lessons · self-paced',
    outcome: 'Build a steady saving habit and a realistic emergency buffer.',
  },
  {
    id: 'debt-credit',
    name: 'Debt & Credit Management',
    level: 'Intermediate',
    format: '7 lessons · with templates',
    outcome: 'Plan debt repayment clearly and understand how credit scores work.',
  },
  {
    id: 'tax-documentation',
    name: 'Tax & Documentation Basics',
    level: 'Intermediate',
    format: '6 lessons · self-paced',
    outcome: 'Get comfortable with everyday tax terms, records, and documentation.',
  },
  {
    id: 'family-planning',
    name: 'Financial Planning for Families',
    level: 'All levels',
    format: '8 lessons · household worksheets',
    outcome: 'Create practical systems for shared household money decisions.',
  },
  {
    id: 'freelancer-money',
    name: 'Money Management for Freelancers',
    level: 'Intermediate',
    format: '7 lessons · with trackers',
    outcome: 'Smooth out irregular income and build dependable cash-flow habits.',
  },
  {
    id: 'business-cashflow',
    name: 'Business Cash Flow Basics',
    level: 'Intermediate',
    format: '6 lessons · self-paced',
    outcome: 'Read cash flow with confidence and plan around lean and busy months.',
  },
  {
    id: 'financial-news',
    name: 'Understanding Financial News',
    level: 'All levels',
    format: '5 lessons · with explainers',
    outcome: 'Follow financial news without jargon and know what actually matters.',
  },
  {
    id: 'smart-spending',
    name: 'Smart Spending & Decision-Making',
    level: 'Beginner',
    format: '6 lessons · self-paced',
    outcome: 'Make calmer, clearer money decisions using simple repeatable checks.',
  },
] as const;
