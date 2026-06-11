export type Course = {
  id: string;
  slug: string;
  name: string;
  level: string;
  format: string;
  outcome: string;
  description?: string;
  pricePaise?: number | null;
  status: string;
  sortOrder: number;
  createdAt: string;
};

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch('/api/courses', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load courses');
  const data = await res.json();
  return data.items || [];
}
