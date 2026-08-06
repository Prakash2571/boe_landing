'use client';

import { useState } from 'react';
import Link from 'next/link';
import { site } from '../content/site';
import { navLinks, authLinks } from '../content/nav';
import ThemeToggle from './ThemeToggle';

// This site has no sessions. There is no "signed in" state to reflect, no user
// name to greet and no log-out to offer: signing up submits an application, and
// everything after that (email confirmation, admin approval, credentials) belongs
// to the app stack. So the nav has exactly one account action — Sign up.

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link className="nav__brand" href="/" aria-label={`${site.name} home`}>
          {site.name}
        </Link>

        <nav aria-label="Primary">
          <ul className="nav__links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link className="nav__link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions nav__desktop-actions">
          <ThemeToggle />
          <Link className="btn btn--primary" href={authLinks.signUp.href}>
            {authLinks.signUp.label}
          </Link>
        </div>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div className="nav__mobile" id="nav-mobile">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link className="nav__link" href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            className="btn btn--primary btn--block"
            href={authLinks.signUp.href}
            onClick={() => setOpen(false)}
          >
            {authLinks.signUp.label}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
