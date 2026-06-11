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
              <Link href="/courses" className="bento-tile bento-tile--large stagger-item">
                <h3>Courses</h3>
                <p>Practical lessons for real-life money decisions.</p>
              </Link>
              <Link href="/premium" className="bento-tile stagger-item">
                <h3>Premium</h3>
                <p>News briefings, live sessions, and worksheets.</p>
              </Link>
              <Link href="/news" className="bento-tile stagger-item">
                <h3>News</h3>
                <p>Jargon-free financial briefings.</p>
              </Link>
              <Link href="/plans" className="bento-tile stagger-item">
                <h3>Plans</h3>
                <p>Choose the access that fits you.</p>
              </Link>
              <Link href="/about" className="bento-tile bento-tile--wide stagger-item">
                <h3>About</h3>
                <p>Built by educators who believe clarity beats complexity.</p>
              </Link>
            </div>
          </div>
        </section>
        <SocialProof />
        <LeadForm />
      </main>
      <Footer />
    </>
  );
}
