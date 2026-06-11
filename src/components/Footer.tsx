import { site } from '../content/site';
import { authLinks } from '../content/nav';

// Education-positioned footer with the mandatory educational disclaimer.
// No investment-advice or account-opening links.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">{site.name}</div>
            <p className="footer__desc">{site.longDescriptor}</p>
          </div>

          <div className="footer__col">
            <h4>Courses</h4>
            <ul>
              <li><a href="/courses">All courses</a></li>
              <li><a href="/about">How it works</a></li>
              <li><a href="/plans">Get course details</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Premium</h4>
            <ul>
              <li><a href="/premium">Membership benefits</a></li>
              <li><a href="/news">Financial news</a></li>
              <li><a href="/plans">Plans</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Stay informed</h4>
            <ul>
              <li><a href="/">Newsletter signup</a></li>
              <li><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>
              <li><a href={authLinks.signIn.href}>Sign in</a></li>
            </ul>
          </div>
        </div>

        <p className="footer__disclaimer">{site.disclaimer}</p>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {site.name}. {site.descriptor}
          </span>
          <span>
            <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> ·{' '}
            <a href="/disclaimer">Educational disclaimer</a> ·{' '}
            <a href="/refund">Refund policy</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
