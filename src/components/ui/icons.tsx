"use client";

export function TennisBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10" fillOpacity="0.2" />
      <path d="M2.5 12c0-2.8 1.4-5.3 3.5-6.8A10 10 0 0121.5 12a10 10 0 01-15.5 6.8C4 17.3 2.5 14.8 2.5 12z" fillOpacity="0.1" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-2.9-.4-4.1-1.1.8-1.5 2.2-2.6 3.9-2.9 1.7.3 3.1 1.4 3.9 2.9C14.9 19.6 13.5 20 12 20zm-5.3-3.1c-.9-1.3-1.5-2.9-1.5-4.6 0-1.7.6-3.3 1.5-4.6.4.8 1 1.5 1.7 2-.6.8-1 1.9-1 3 0 1.1.4 2.2 1 3-.7.5-1.3 1.2-1.7 2zm2.4-9.4c1.2-.7 2.6-1.1 4.1-1.1s2.9.4 4.1 1.1c-.8 1.5-2.2 2.6-3.9 2.9-1.7-.3-3.1-1.4-3.9-2.9zm7.6 4.8c.6-.8 1-1.9 1-3 0-1.1-.4-2.2-1-3 .7-.5 1.3-1.2 1.7-2 .9 1.3 1.5 2.9 1.5 4.6 0 1.7-.6 3.3-1.5 4.6-.4-.8-1-1.5-1.7-2z" />
    </svg>
  );
}

export function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}
