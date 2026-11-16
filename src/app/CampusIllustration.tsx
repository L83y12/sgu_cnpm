/** Simple flat illustration of a campus building, trees and a path, used as a header decoration. */
export function CampusIllustration() {
  return (
    <svg className="campus-illustration" viewBox="0 0 360 170" role="img" aria-label="Illustration of a campus building with trees">
      <circle cx="294" cy="38" r="22" fill="#f6d98b" />
      <path d="M0 150 Q70 118 140 140 T290 132 T360 144 V170 H0Z" fill="#dcebd6" />
      <path d="M0 160 Q90 138 180 156 T360 152 V170 H0Z" fill="#c5dcbf" />
      <rect x="92" y="70" width="176" height="82" rx="4" fill="#f4efe3" stroke="#d8cfba" />
      <rect x="132" y="48" width="96" height="104" rx="4" fill="#fbf7ec" stroke="#d8cfba" />
      <path d="M126 50 L180 24 L234 50Z" fill="#c9694b" />
      <rect x="170" y="114" width="20" height="38" rx="2" fill="#7d5a3f" />
      <g fill="#a9c9d9">
        <rect x="142" y="62" width="16" height="18" rx="2" /><rect x="172" y="62" width="16" height="18" rx="2" /><rect x="202" y="62" width="16" height="18" rx="2" />
        <rect x="142" y="90" width="16" height="18" rx="2" /><rect x="202" y="90" width="16" height="18" rx="2" />
        <rect x="104" y="86" width="16" height="18" rx="2" /><rect x="104" y="116" width="16" height="18" rx="2" />
        <rect x="240" y="86" width="16" height="18" rx="2" /><rect x="240" y="116" width="16" height="18" rx="2" />
      </g>
      <path d="M180 152 L160 170 H200Z" fill="#e8dfc9" />
      <g>
        <rect x="46" y="116" width="6" height="36" fill="#7d5a3f" /><circle cx="49" cy="108" r="22" fill="#5e9b79" /><circle cx="38" cy="120" r="14" fill="#7bb592" />
        <rect x="306" y="120" width="6" height="32" fill="#7d5a3f" /><circle cx="309" cy="112" r="19" fill="#4d8b61" /><circle cx="320" cy="124" r="12" fill="#7bb592" />
      </g>
      <g fill="#fff" opacity=".85"><ellipse cx="60" cy="34" rx="22" ry="7" /><ellipse cx="78" cy="30" rx="16" ry="7" /><ellipse cx="230" cy="22" rx="18" ry="6" /></g>
    </svg>
  )
}
