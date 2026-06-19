// Server-only catalog fetchers used by Server Components (Courses / Plans
// pages). These run on the server, so they call the backend directly via its
// absolute URL — a relative `/api/...` fetch cannot be resolved during server
// rendering and would always fail ("Unable to load ...").

import { serverEnv } from './env';
import type { Course } from './courses';
import type { Plan } from './plans';

export async function getCoursesFromBackend(): Promise<Course[]> {
  const res = await fetch(`${serverEnv.backendBase()}/v1/public/courses`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load courses');
  const data = await res.json();
  return (data.items as Course[]) || [];
}

export async function getPlansFromBackend(): Promise<Plan[]> {
  const res = await fetch(`${serverEnv.backendBase()}/v1/public/plans`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load plans');
  const data = await res.json();
  return (data.items as Plan[]) || [];
}
