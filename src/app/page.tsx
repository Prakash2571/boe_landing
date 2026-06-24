import Link from 'next/link';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import SocialProof from '../components/SocialProof';
import LeadForm from '../components/LeadForm';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">Explore what matters to you</h2>
              <p className="section__lead">
                Courses, premium insights, news briefings, and flexible plans, all designed to help you understand money with confidence.
              </p>
            </div>
            <div className="bento-grid">
              <Link href="/courses" className="bento-tile bento-tile--large bento-tile--media stagger-item">
                <img
                  className="bento-tile__img"
                  src="https://images.unsplash.com/photo-1488998427799-e3362cec87c3?auto=format&fit=crop&w=900&q=80"
                  alt="Learner taking notes during a finance lesson"
                  loading="lazy"
                />
                <span className="bento-tile__overlay" aria-hidden="true" />
                <span className="bento-tile__body">
                  <h3>Courses</h3>
                  <p>Practical lessons for real-life money decisions.</p>
                  <span className="bento-tile__cta">Explore courses →</span>
                </span>
              </Link>
              <Link href="/premium" className="bento-tile bento-tile--media stagger-item">
                <img
                  className="bento-tile__img"
                  src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=700&q=80"
                  alt="Premium financial briefings and worksheets"
                  loading="lazy"
                />
                <span className="bento-tile__overlay" aria-hidden="true" />
                <span className="bento-tile__body">
                  <h3>Premium</h3>
                  <p>News briefings, live sessions, and worksheets.</p>
                  <span className="bento-tile__cta">See benefits →</span>
                </span>
              </Link>
              <Link href="/news" className="bento-tile bento-tile--media stagger-item">
                <img
                  className="bento-tile__img"
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=700&q=80"
                  alt="Newspaper with financial headlines"
                  loading="lazy"
                />
                <span className="bento-tile__overlay" aria-hidden="true" />
                <span className="bento-tile__body">
                  <h3>News</h3>
                  <p>Jargon-free financial briefings.</p>
                  <span className="bento-tile__cta">Read briefings →</span>
                </span>
              </Link>
              <Link href="/plans" className="bento-tile bento-tile--media stagger-item">
                <img
                  className="bento-tile__img"
                  src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&w=700&q=80"
                  alt="Planning learning access and pricing"
                  loading="lazy"
                />
                <span className="bento-tile__overlay" aria-hidden="true" />
                <span className="bento-tile__body">
                  <h3>Plans</h3>
                  <p>Choose the access that fits you.</p>
                  <span className="bento-tile__cta">Compare plans →</span>
                </span>
              </Link>
              <Link href="/about" className="bento-tile bento-tile--wide bento-tile--media stagger-item">
                <img
                  className="bento-tile__img"
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"
                  alt="Educators collaborating on finance content"
                  loading="lazy"
                />
                <span className="bento-tile__overlay" aria-hidden="true" />
                <span className="bento-tile__body">
                  <h3>About</h3>
                  <p>Built by educators who believe clarity beats complexity.</p>
                  <span className="bento-tile__cta">Our mission →</span>
                </span>
              </Link>
            </div>
          </div>
        </section>
        <SocialProof />
        <LeadForm />
        <section className="disclaimer-band" aria-label="Educational disclaimer">
          <div className="container">
            <p className="disclaimer-band__text">
              We are an educational platform. We do not provide SEBI-registered
              investment advice or financial planning services.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
