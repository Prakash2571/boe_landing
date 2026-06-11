// Premium membership benefits + the learning method. No guaranteed-outcome,
// returns, or wealth-growth language.

export type Benefit = { id: string; title: string; description: string };

export const premiumBenefits: readonly Benefit[] = [
  {
    id: 'news-briefings',
    title: 'Daily & weekly news briefings',
    description: 'Curated money and economy updates, summarised so you stay informed in minutes.',
  },
  {
    id: 'explainers',
    title: 'Plain-language explainers',
    description: 'Economic events broken down without jargon, so the news makes sense.',
  },
  {
    id: 'newsletters',
    title: 'Premium newsletters',
    description: 'Member newsletters with practical money ideas and clear takeaways.',
  },
  {
    id: 'live-qa',
    title: 'Live Q&A sessions',
    description: 'Ask questions and learn directly in member-only live sessions.',
  },
  {
    id: 'templates',
    title: 'Templates & worksheets',
    description: 'Downloadable budgeting templates, money trackers, and planning worksheets.',
  },
  {
    id: 'webinars',
    title: 'Member webinars',
    description: 'Deeper sessions on saving, budgeting, credit, and everyday financial habits.',
  },
  {
    id: 'certificates',
    title: 'Course certificates',
    description: 'Earn completion certificates as you finish courses.',
  },
  {
    id: 'community',
    title: 'Private learning community',
    description: 'A members-only space to learn alongside others building better money habits.',
  },
  {
    id: 'early-access',
    title: 'Early access to new courses',
    description: 'Be first to new courses, explainers, and learning material.',
  },
] as const;

export type LearningStep = { step: number; title: string; description: string };

export const learningSteps: readonly LearningStep[] = [
  {
    step: 1,
    title: 'Choose a course or membership plan',
    description: 'Start with a single course or join premium for ongoing learning.',
  },
  {
    step: 2,
    title: 'Learn through short, practical lessons',
    description: 'Bite-sized lessons with real-life examples you can use right away.',
  },
  {
    step: 3,
    title: 'Apply concepts with worksheets and trackers',
    description: 'Put each idea into practice with templates and money trackers.',
  },
  {
    step: 4,
    title: 'Follow curated financial news and explainers',
    description: 'Stay aware with jargon-free briefings that connect to what you learn.',
  },
  {
    step: 5,
    title: 'Build repeatable money habits over time',
    description: 'Turn steady learning into habits you keep for the long run.',
  },
] as const;
