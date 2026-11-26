// Қошқар мүйіз (ram's horn) motif as a repeating strip. Decorative only.
export function Ornament({ className = "", color = "#F5B400" }: { className?: string; color?: string }) {
  const id = `oyu-${color.replace("#", "")}`;
  return (
    <svg className={className} aria-hidden="true" width="100%" height="18" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="36" height="18" patternUnits="userSpaceOnUse">
          <path
            d="M18 16 V10 C18 4 11 3 9 7 C7.5 10 10.5 12.5 12.5 10.5 M18 10 C18 4 25 3 27 7 C28.5 10 25.5 12.5 23.5 10.5"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="18" fill={`url(#${id})`} />
    </svg>
  );
}

/** Single motif for the logo and empty states. */
export function Muiz({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 20" aria-hidden="true">
      <path
        d="M18 19 V11 C18 4 10 2.5 7.5 7 C5.5 11 10 14 12.5 11.5 M18 11 C18 4 26 2.5 28.5 7 C30.5 11 26 14 23.5 11.5"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
