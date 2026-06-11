import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { fetchPlans, type Plan, formatPrice } from '../../lib/plans';

function FeaturedPlan({ plan }: { plan: Plan }) {
  return (
    <Reveal as="div" className="card plan plan--featured stagger-item">
      <span className="plan__badge">Most popular</span>
      <h2 className="plan__name" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>{plan.name}</h2>
      <div className="plan__price">
        {formatPrice(plan.pricePaise)} <span>· {plan.cadence.replace('_', ' ')}</span>
      </div>
      <p className="plan__tagline">{plan.tagline}</p>
      <ul className="plan__features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <a className="btn btn--primary btn--block" href="/signup">
        {plan.ctaLabel}
      </a>
    </Reveal>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Reveal as="div" className="card plan stagger-item">
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
      <a className="btn btn--ghost btn--block" href="/signup">
        {plan.ctaLabel}
      </a>
    </Reveal>
  );
}

export default async function PlansPage() {
  let plans: Plan[] = [];
  let error = false;
  try {
    plans = await fetchPlans();
  } catch {
    plans = [];
    error = true;
  }

  const featured = plans.find((p) => p.featured) || plans[0];
  const rest = plans.filter((p) => p.id !== featured?.id);

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">Plans</span>
              <h1 className="section__title">Choose how you want to learn</h1>
              <p className="section__lead">
                Start with a single course or join premium for ongoing learning, news briefings, and live sessions.
              </p>
            </div>
            {error ? (
              <div className="empty-state">
                <p className="section__lead">Unable to load plans right now. Please try again later.</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="empty-state">
                <p className="section__lead">No plans available right now. Check back soon.</p>
              </div>
            ) : (
              <>
                {featured ? <FeaturedPlan plan={featured} /> : null}
                {rest.length > 0 ? (
                  <div className="grid grid--2" style={{ marginTop: '1.5rem' }}>
                    {rest.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
