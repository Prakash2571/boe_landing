import { Suspense } from 'react';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import EnquiryForm from '../../components/EnquiryForm';

export const metadata = {
  title: 'Enquire · BeOnEdge',
  description: 'Ask about a BeOnEdge course or membership plan.',
};

export default function EnquiryPage() {
  return (
    <>
      <Nav />
      <main className="auth-page">
        <section className="container auth-page__inner" aria-labelledby="enquiry-title">
          <div className="auth-card">
            <span className="eyebrow">Enquire</span>
            <h1 className="section__title" id="enquiry-title">
              Tell us what you want to learn
            </h1>
            <p className="section__lead">
              Share your details and the course or plan you&apos;re interested in. We&apos;ll send
              the relevant information by email — no pressure.
            </p>
            <Suspense fallback={null}>
              <EnquiryForm />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
