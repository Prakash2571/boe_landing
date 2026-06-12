import Link from 'next/link';
import { authLinks, primaryCta, secondaryCta } from '../content/nav';

// Education-focused hero. No stock tickers, trading charts, return graphics,
// portfolio cards, or SIP/lumpsum language - an editorial course/digest
// preview only.
export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__grid">
        <div>
          <span className="eyebrow">Learn finance with clarity</span>
          <h1 className="hero__title">
            Understand money and manage it smarter.
          </h1>
          <p className="hero__lead">
            Practical finance courses and premium insights that help you
            budget, save, handle debt and credit, and follow financial news
            without the jargon.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href={primaryCta.href}>
              {primaryCta.label}
            </Link>
            <Link className="btn btn--ghost" href={secondaryCta.href}>
              {secondaryCta.label}
            </Link>
          </div>
          <p className="hero__note">
            New here? <Link href={authLinks.signUp.href}>Sign up</Link> to create a
            free learner account.
          </p>
        </div>

        <div className="hero__media" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80"
            alt="Financial planning documents and calculator"
            className="hero__image"
            width={600}
            height={450}
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
