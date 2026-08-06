import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import VerifyEmail from '../../components/VerifyEmail';

// Target of the confirmation link in the signup email. The app backend composes
// `${PUBLIC_LANDING_ORIGIN}/verify-email?token=…`, so this route must keep its
// path and its `token` query parameter — changing either breaks every link
// already sitting in someone's inbox.

export const metadata = {
  title: 'Confirm your email — BeOnEdge',
  // Confirmation URLs carry a single-use token; keep them out of search indexes.
  robots: { index: false, follow: false },
};

// The token arrives per-request, so this page must not be statically rendered.
export const dynamic = 'force-dynamic';

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] };
}) {
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);

  return (
    <>
      <Nav />
      <main className="auth-page">
        <section className="container auth-page__inner" aria-labelledby="verify-title">
          <div className="auth-card">
            <span className="eyebrow">Email confirmation</span>
            <h1 className="section__title" id="verify-title">Confirming your email</h1>
            <VerifyEmail token={token} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
