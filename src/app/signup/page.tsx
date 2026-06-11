import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import SignupForm from '../../components/SignupForm';

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
              Create your account to keep your learning profile ready across BeOnEdge.
            </p>
            <SignupForm />
            <p className="auth-switch">
              Already have an account? <a href="/login">Sign in</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
