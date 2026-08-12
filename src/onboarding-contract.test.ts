import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

describe('canonical onboarding surface', () => {
  it('contains no website email-verification route or page', async () => {
    await expect(access(new URL('./app/api/newuser/verify-email/route.ts', import.meta.url))).rejects.toThrow();
    await expect(access(new URL('./app/verify-email/page.tsx', import.meta.url))).rejects.toThrow();
  });

  it('does not promise a signup confirmation email in visible copy', async () => {
    const copy = `${await read('./app/signup/page.tsx')}\n${await read('./components/SignupForm.tsx')}`;
    expect(copy).not.toMatch(/confirmation email|confirm your address|email you a link|link is valid/iu);
    expect(copy).toMatch(/review/iu);
  });
});
