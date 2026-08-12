import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import SignupForm from '../../components/SignupForm';

// No RedirectIfAuthed here any more. Signing up no longer creates a session on
// this site — it registers an application directly for admin review. There is no "already
// signed in" state for this page to bounce away from.
//
// The form does collect a password, but only to send it upstream: it becomes the
// credential for the gated app once an admin approves the application. Nothing on
// this site can be signed into.

export const metadata = {
  title: 'Create your account — BeOnEdge',
};

export default function SignupPage() {
  return (
    <>
      <Nav />
      <main className="auth-page">
        <section className="container auth-page__inner" aria-labelledby="signup-title">
          <div className="auth-card">
            <span className="eyebrow">Create account</span>
            <h1 className="section__title" id="signup-title">Start with BeOnEdge</h1>
            <p className="section__lead">
              Tell us how to reach you and choose a password. Our team will review your application
              and email you with the decision. If approved, that email includes the official app
              download link, and you sign in with the password you set here.
            </p>
            <SignupForm />
            <p className="auth-switch">
              Already applied? Our team will email you after review.{' '}
              <a href="/contact">Contact us</a> if you need help.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
