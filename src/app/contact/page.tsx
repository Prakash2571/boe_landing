import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import { site } from '../../content/site';

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">Get in touch</span>
              <h1 className="section__title">Contact Us</h1>
              <p className="section__lead">
                If you have any questions regarding our educational programs,
                courses, or content, please feel free to contact us through the
                contact information provided below.
              </p>
            </div>

            <div className="contact-grid">
              <div className="card contact-card">
                <div className="contact-card__head">
                  <span className="contact-card__icon"><MailIcon /></span>
                  <h3 className="contact-card__title">Email</h3>
                </div>
                <a className="contact-card__value" href="mailto:support@beonedge.com">
                  support@beonedge.com
                </a>
              </div>

              <div className="card contact-card">
                <div className="contact-card__head">
                  <span className="contact-card__icon"><PhoneIcon /></span>
                  <h3 className="contact-card__title">Phone</h3>
                </div>
                <div className="contact-card__values">
                  <a className="contact-card__value" href="tel:+919241131386">
                   +91 9241131386
                  </a>
                  <a className="contact-card__value" href="tel:+918789136062">
                    +91 8789136062
                  </a>
                </div>
              </div>

              <div className="card contact-card contact-card--wide">
                <div className="contact-card__head">
                  <span className="contact-card__icon"><PinIcon /></span>
                  <h3 className="contact-card__title">Office Address</h3>
                </div>
                <p className="contact-card__value">
                  BeOnEdge LLP
                  <br />
                  377, Powrah, Ghatsila, East Singhbhum- 832303, Jharkhand, India
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
