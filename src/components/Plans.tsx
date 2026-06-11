import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { type Plan, formatPrice } from '../lib/plans';

// Education-access tiers. CTAs are education-only - never invest/SIP/buy-fund/
// open-account language.
export default function Plans({ plans }: { plans: Plan[] }) {
  return (
    <section className="section" id="plans">
      <div className="container">
        <SectionHead
          eyebrow="Plans"
          title="Choose how you want to learn"
          lead="Start with a single course or join premium for ongoing learning, news briefings, and live sessions."
        />
        {plans.length === 0 ? (
          <div className="empty-state">
            <p className="section__lead">No plans available right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid--3">
            {plans.map((plan) => (
              <Reveal
                as="div"
                key={plan.id}
                className={`card plan stagger-item ${plan.featured ? 'plan--featured' : ''}`}
              >
                {plan.featured ? <span className="plan__badge">Most popular</span> : null}
                <h3 className="plan__name">{plan.name}</h3>
                <div className="plan__price">
                  {formatPrice(plan.pricePaise)} <span>· {plan.cadence.replace('_', ' ')}</span>
                </div>
                <p className="plan__tagline">{plan.tagline}</p>
                <ul className="plan__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a
                  className={`btn ${plan.featured ? 'btn--primary' : 'btn--ghost'} btn--block`}
                  href="/signup"
                >
                  {plan.ctaLabel}
                </a>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
