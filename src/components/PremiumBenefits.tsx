import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { premiumBenefits } from '../content/benefits';

// Membership benefits grid. No guaranteed-outcome, returns, or wealth-growth
// language.
export default function PremiumBenefits() {
  return (
    <section className="section section--sunken" id="premium">
      <div className="container">
        <SectionHead
          eyebrow="Premium"
          title="Membership that keeps paying off"
          lead="Premium gives you ongoing learning, curated financial news, and practical tools, useful well beyond a single course."
        />
        <div className="grid grid--3">
          {premiumBenefits.map((benefit) => (
            <Reveal as="div" key={benefit.id} className="card">
              <h3 className="benefit__title">{benefit.title}</h3>
              <p className="benefit__desc">{benefit.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
