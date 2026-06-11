'use client';

import { useState } from 'react';
import Link from 'next/link';
import { site } from '../content/site';
import { navLinks, authLinks } from '../content/nav';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';

function displayName(user: { firstName?: string; name?: string; username?: string | null } | null) {
  return user?.firstName || user?.name || user?.username || 'there';
}

// Sign in / Sign up create a LEARNER account (the gateway account). They are
// never described as opening an investment or brokerage account.
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { user, logout } = useAuth();

  async function onLogout() {
    setLogoutError('');
    try {
      await logout();
      setOpen(false);
    } catch {
      setLogoutError('Signed out locally. Please refresh if the session remains active.');
    }
  }

  const authActions = user ? (
    <>
      <span className="nav__user">Hi {displayName(user)}</span>
      <button type="button" className="nav__logout" onClick={onLogout}>
        Log out
      </button>
    </>
  ) : (
    <>
      <Link className="nav__signin" href={authLinks.signIn.href}>
        {authLinks.signIn.label}
      </Link>
      <Link className="btn btn--primary" href={authLinks.signUp.href}>
        {authLinks.signUp.label}
      </Link>
    </>
  );

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
          {authActions}
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
                <Link
                  className="nav__link"
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <span className="nav__user">Hi {displayName(user)}</span>
              ) : (
                <Link className="nav__signin" href={authLinks.signIn.href} onClick={() => setOpen(false)}>
                  {authLinks.signIn.label}
                </Link>
              )}
            </li>
          </ul>
          {user ? (
            <button type="button" className="btn btn--primary btn--block" onClick={onLogout}>
              Log out
            </button>
          ) : (
            <Link
              className="btn btn--primary btn--block"
              href={authLinks.signUp.href}
              onClick={() => setOpen(false)}
            >
              {authLinks.signUp.label}
            </Link>
          )}
          {logoutError ? <p className="form__status form__status--error">{logoutError}</p> : null}
        </div>
      ) : null}
      {logoutError && !open ? (
        <div className="container">
          <p className="form__status form__status--error nav__error">{logoutError}</p>
        </div>
      ) : null}
    </header>
  );
}
