import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import SignupForm from '../../components/SignupForm';

// No RedirectIfAuthed here any more. Signing up no longer creates a session on
// this site — it registers an application with the app backend, which confirms
// the email and then queues the person for admin review. There is no "already
// signed in" state for this page to bounce away from.

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
              Tell us how to reach you. We will email you a link to confirm your address, then our
              team reviews your application and sends your access details.
            </p>
            <SignupForm />
            <p className="auth-switch">
              Already applied? Check your inbox for the confirmation email — or{' '}
              <a href="/contact">contact us</a> if you did not receive it.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
