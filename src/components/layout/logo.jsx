export function Logo({ className = "" }) {
    return (<span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden><path d="M16 2C8.8 2 3 7.4 3 14c0 2.6.9 5 2.4 7L4 29l7.6-2.6c1.4.4 2.8.6 4.4.6 7.2 0 13-5.4 13-12S23.200 2 16 2z" fill="#25d366"/><path d="M10 11h12M10 15h12M10 19h7" stroke="#05211a" strokeWidth="2" strokeLinecap="round"/></svg>
      <span>واتساب ستور</span>
    </span>);
}
