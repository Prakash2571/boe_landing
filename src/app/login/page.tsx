import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <>
      <Nav />
      <main className="auth-page">
        <section className="container auth-page__inner" aria-labelledby="login-title">
          <div className="auth-card">
            <span className="eyebrow">Sign in</span>
            <h1 className="section__title" id="login-title">Welcome back</h1>
            <p className="section__lead">
              Sign in to continue through the education content with your account.
            </p>
            <LoginForm />
            <p className="auth-switch">
              New to BeOnEdge? <a href="/signup">Create an account</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
