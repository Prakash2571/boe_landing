import Link from 'next/link';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { newsDigests } from '../../content/news';

export default function NewsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">News</span>
              <h1 className="section__title">Financial news, explained</h1>
              <p className="section__lead">
                Jargon-free briefings on economy, tax, credit, and policy. Know what matters, not just what happened.
              </p>
            </div>
            <div className="grid grid--3">
              {newsDigests.map((item) => (
                <Reveal as="div" key={item.id} className="card stagger-item">
                  <span className="digest__tag">{item.tag}</span>
                  <h3 className="digest__title">{item.title}</h3>
                  <p className="digest__summary">{item.summary}</p>
                </Reveal>
              ))}
            </div>
            <div className="section__head" style={{ marginTop: '3rem', textAlign: 'center' }}>
              <p className="section__lead" style={{ maxWidth: 'none' }}>
                Premium members receive daily and weekly briefings.{' '}
                <Link href="/premium" style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>
                  Explore premium benefits
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
