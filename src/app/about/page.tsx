import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { learningSteps } from '../../content/benefits';
import { stats, testimonials, instructorNote } from '../../content/socialProof';
import { site } from '../../content/site';

const values = [
  {
    id: 'no-jargon',
    title: 'No jargon',
    description:
      'We explain money the way you would explain it to a friend. Complex terms are broken down, not thrown around.',
  },
  {
    id: 'practical-first',
    title: 'Practical first',
    description:
      'Every lesson is built around something you can use today: a budget, a tracker, a decision framework.',
  },
  {
    id: 'education-only',
    title: 'Education-only',
    description:
      'We do not sell investment products, broker accounts, or financial plans. We teach you to think clearly about money.',
  },
  {
    id: 'habits-over-hype',
    title: 'Habits over hype',
    description:
      'Quick tips fade. We focus on systems and habits you can keep for the long run.',
  },
];

const founders = [
  {
    name: 'Ronit Giri',
    role: 'Co-founder',
    bio: 'Ronit leads product and curriculum at BeOnEdge. He believes financial literacy should be as accessible as learning to cook or drive.',
    initials: 'RG',
  },
  {
    name: 'Subhojit Das',
    role: 'Co-founder',
    bio: 'Subhojit oversees content and learner experience. He designs lessons that turn abstract money concepts into daily habits.',
    initials: 'SD',
  },
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Mission + Stats */}
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">About {site.name}</span>
              <h1 className="section__title">Clarity beats complexity</h1>
              <p className="section__lead">
                {site.longDescriptor} We teach practical money skills - budgeting,
                saving, debt management, and news literacy - without jargon or
                product pitches. Our only goal is to help you understand money
                well enough to make your own decisions with confidence.
              </p>
            </div>

            <div className="stats">
              {stats.map((stat) => (
                <div key={stat.id} className="stagger-item">
                  <div className="stat__value">{stat.value}</div>
                  <div className="stat__label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founders */}
        <section className="section section--sunken">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">The people behind it</span>
              <h2 className="section__title">Meet the founders</h2>
              <p className="section__lead">
                BeOnEdge was started by two educators who saw that most financial
                advice is either too complex or too sales-driven. They set out to
                build something simpler and more honest.
              </p>
            </div>

            <div className="founders">
              {founders.map((founder) => (
                <Reveal
                  as="div"
                  key={founder.name}
                  className="card founder-card stagger-item"
                >
                  <div className="founder-avatar">{founder.initials}</div>
                  <h3 className="founder-name">{founder.name}</h3>
                  <p className="founder-role">{founder.role}</p>
                  <p className="founder-bio">{founder.bio}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">What we believe</span>
              <h2 className="section__title">Principles that guide us</h2>
            </div>

            <div className="grid grid--2">
              {values.map((value) => (
                <Reveal
                  as="div"
                  key={value.id}
                  className="card value-card stagger-item"
                >
                  <h3 className="value-title">{value.title}</h3>
                  <p className="value-desc">{value.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Learning Method */}
        <section className="section section--sunken">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">How it works</span>
              <h2 className="section__title">Learning in five steps</h2>
            </div>
            <div className="steps">
              {learningSteps.map((step) => (
                <div key={step.step} className="step stagger-item">
                  <div className="step__num">{step.step}</div>
                  <div>
                    <div className="step__title">{step.title}</div>
                    <p className="step__desc">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">What learners say</span>
              <h2 className="section__title">Learning that builds real confidence</h2>
              <p className="section__lead">{instructorNote}</p>
            </div>
            <div className="grid grid--3">
              {testimonials.map((item) => (
                <Reveal as="div" key={item.id} className="card stagger-item">
                  <p className="quote">“{item.quote}”</p>
                  <p className="quote__by">
                    <strong>{item.name}</strong> · {item.role}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
