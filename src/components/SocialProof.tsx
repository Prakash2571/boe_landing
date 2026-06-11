import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { stats, testimonials, instructorNote } from '../content/socialProof';

// Trust-building block. Outcomes are about learning and habits - never
// guaranteed income, returns, or investment performance.
export default function SocialProof() {
  return (
    <section className="section">
      <div className="container">
        <SectionHead
          eyebrow="Why learners trust us"
          title="Learning that builds real confidence"
          lead={instructorNote}
        />

        <div className="stats">
          {stats.map((stat) => (
            <div key={stat.id}>
              <div className="stat__value">{stat.value}</div>
              <div className="stat__label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid--3">
          {testimonials.map((item) => (
            <Reveal as="div" key={item.id} className="card">
              <p className="quote">“{item.quote}”</p>
              <p className="quote__by">
                <strong>{item.name}</strong> · {item.role}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
