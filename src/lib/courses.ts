export type Course = {
  id: string;
  slug: string;
  name: string;
  level: string;
  format: string;
  outcome: string;
  description?: string;
  topics?: string[];
  image?: string | null;
  pricePaise?: number | null;
  status: string;
  sortOrder: number;
  createdAt: string;
};
