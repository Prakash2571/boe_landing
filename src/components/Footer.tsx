import { site } from '../content/site';

// Education-positioned footer with the mandatory educational disclaimer.
// No investment-advice or account-opening links.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">{site.name}</div>
            <p className="footer__copy">
              © {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
          </div>

          <div className="footer__col">
            <h4>Premium</h4>
            <ul>
              <li><a href="/premium">Membership benefits</a></li>
              <li><a href="/news">Financial news</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>General</h4>
            <ul>
              <li><a href="/about">About us</a></li>
              <li><a href="/contact">Contact us</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Legal</h4>
            <ul>
              <li><a href="/terms">Terms and conditions</a></li>
              <li><a href="/privacy">Privacy policy</a></li>
              <li><a href="/refund">Refund policy</a></li>
              <li><a href="/disclaimer">Educational disclaimer</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
