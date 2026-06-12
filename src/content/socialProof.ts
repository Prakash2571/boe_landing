// Trust-building content. No claims of guaranteed income, returns, wealth
// growth, or investment performance - only learning outcomes.

// export type Stat = { id: string; value: string; label: string };

// export const stats: readonly Stat[] = [
//   { id: 'learners', value: '40,000+', label: 'Learners enrolled' },
//   { id: 'completions', value: '120,000+', label: 'Lessons completed' },
//   { id: 'subscribers', value: '85,000+', label: 'Newsletter subscribers' },
//   { id: 'rating', value: '4.8 / 5', label: 'Average course rating' },
// ];

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
};

export const testimonials: readonly Testimonial[] = [
  {
    id: 't1',
    quote:
      'I finally have a budgeting system I actually stick to. The lessons are short and practical.',
    name: 'Ananya R.',
    role: 'First-time earner',
  },
  {
    id: 't2',
    quote:
      'The debt and credit course gave me a clear repayment plan. No jargon, just steps I could follow.',
    name: 'Vikram S.',
    role: 'Young professional',
  },
  {
    id: 't3',
    quote:
      'As a freelancer, the cash-flow trackers changed how I handle irregular income.',
    name: 'Meera J.',
    role: 'Freelance designer',
  },
];

export const instructorNote =
  'Courses are built and reviewed by finance educators with years of teaching experience in personal finance and money management.';
