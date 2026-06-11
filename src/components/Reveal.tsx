'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Subtle reveal-on-scroll wrapper. Progressive enhancement only: content is
// fully visible without JS and for users who prefer reduced motion.
export default function Reveal({
  children,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'li';
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cls = `reveal ${visible ? 'is-visible' : ''} ${className}`.trim();
  return (
    <Tag ref={ref as never} className={cls}>
      {children}
    </Tag>
  );
}
