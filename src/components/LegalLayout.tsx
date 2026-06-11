'use client';

import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import Reveal from './Reveal';
import type { LegalPolicy } from '../content/legal';

// Slug for in-page anchors, derived from the section heading text.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function LegalLayout({ policy }: { policy: LegalPolicy }) {
  return (
    <>
      <Nav />
      <main className="legal">
        <div className="container legal__grid">
          <aside className="legal__aside">
            <Link href="/" className="legal__back">
              ← Back to home
            </Link>
            <nav className="legal__toc" aria-label="On this page">
              <span className="legal__toc-label">On this page</span>
              <ol>
                {policy.sections.map((section, i) => (
                  <li key={i}>
                    <a href={`#${slugify(section.heading)}`}>{section.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="legal__body">
            <header className="legal__header">
              <span className="eyebrow">Legal</span>
              <h1 className="legal__title">{policy.title}</h1>
              <p className="legal__updated">Last updated: {policy.lastUpdated}</p>
            </header>

            {policy.sections.map((section, i) => (
              <Reveal as="section" key={i} className="legal__section">
                <h2 id={slugify(section.heading)} className="legal__section-title">
                  {section.heading}
                </h2>
                {section.body.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </Reveal>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
