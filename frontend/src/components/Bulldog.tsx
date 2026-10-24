// Original, simple bulldog-badge illustration used as the chat assistant's avatar.
export default function Bulldog({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="bulldog">
      <circle cx="32" cy="32" r="31" fill="#00356b" stroke="#fff" strokeWidth="2" />
      <path d="M14 22c-3-6 2-11 7-8l4 4M50 22c3-6-2-11-7-8l-4 4" fill="#e9dfcf" stroke="#2b2a28" strokeWidth="1.5" />
      <ellipse cx="32" cy="35" rx="17" ry="15" fill="#f3ebde" stroke="#2b2a28" strokeWidth="1.5" />
      <ellipse cx="32" cy="42" rx="11" ry="7.5" fill="#e9dfcf" stroke="#2b2a28" strokeWidth="1.2" />
      <circle cx="25" cy="31" r="2.6" fill="#1b1f24" />
      <circle cx="39" cy="31" r="2.6" fill="#1b1f24" />
      <circle cx="25.8" cy="30.2" r=".8" fill="#fff" />
      <circle cx="39.8" cy="30.2" r=".8" fill="#fff" />
      <path d="M28.5 38.5c1.5-1.6 5.5-1.6 7 0-1 2-6 2-7 0z" fill="#1b1f24" />
      <path d="M32 40v3M26 44c3 2.5 9 2.5 12 0" stroke="#2b2a28" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M27 47.5l1.5-2.2M37 47.5l-1.5-2.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 52h28l-3 6H21z" fill="#286dc0" />
      <text x="32" y="57" textAnchor="middle" fontSize="5" fontFamily="Graduate, serif" fill="#fff">CC</text>
    </svg>
  )
}
