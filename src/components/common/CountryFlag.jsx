/**
 * CountryFlag.jsx
 * Rene, tilgjengelige SVG-vektorflagg (uten emojier, jf. no-emojis-regelen)
 * for Norge (bokmål og nynorsk) og de 18 fremmed- og morsmålsspråkene fra VoxLex.
 */
export default function CountryFlag({ code, width = 20, height = 14 }) {
  const norm = code === 'nob' || code === 'nno' || code === 'nb' || code === 'nn' ? 'no' : code === 'eng' ? 'en' : code;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="rounded-[2px] border border-white/20 shrink-0 shadow-sm"
    >
      {norm === 'no' && (
        <>
          <rect width="24" height="16" fill="#BA0C2F" />
          <path d="M0 6H24V10H0V6ZM6 0H10V16H6V0Z" fill="#FFFFFF" />
          <path d="M0 7H24V9H0V7ZM7 0H9V16H7V0Z" fill="#00205B" />
        </>
      )}
      {norm === 'en' && (
        <>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M0 6H24V10H0V6ZM9.5 0H14.5V16H9.5V0Z" fill="#FFFFFF" />
          <path d="M0 7H24V9H0V7ZM10.5 0H13.5V16H10.5V0Z" fill="#C8102E" />
        </>
      )}
      {norm === 'de' && (
        <>
          <rect width="24" height="5.33" fill="#000000" />
          <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
        </>
      )}
      {norm === 'es' && (
        <>
          <rect width="24" height="16" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
          <circle cx="7" cy="8" r="1.8" fill="#AA151B" />
        </>
      )}
      {norm === 'fr' && (
        <>
          <rect width="8" height="16" fill="#002395" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#ED2939" />
        </>
      )}
      {norm === 'ar' && (
        <>
          <rect width="24" height="16" fill="#006C35" />
          <circle cx="11" cy="8" r="4.2" fill="#FFFFFF" />
          <circle cx="12.5" cy="8" r="3.4" fill="#006C35" />
          <rect x="4" y="13" width="16" height="1.2" rx="0.6" fill="#FFFFFF" />
        </>
      )}
      {norm === 'uk' && (
        <>
          <rect width="24" height="8" fill="#0057B7" />
          <rect y="8" width="24" height="8" fill="#FFD700" />
        </>
      )}
      {norm === 'ru' && (
        <>
          <rect width="24" height="5.33" fill="#FFFFFF" />
          <rect y="5.33" width="24" height="5.34" fill="#0039A6" />
          <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
        </>
      )}
      {norm === 'th' && (
        <>
          <rect width="24" height="16" fill="#A51931" />
          <rect y="2.67" width="24" height="10.66" fill="#F4F5F8" />
          <rect y="5.33" width="24" height="5.34" fill="#2D2A4A" />
        </>
      )}
      {norm === 'tr' && (
        <>
          <rect width="24" height="16" fill="#E30A17" />
          <circle cx="9.5" cy="8" r="4" fill="#FFFFFF" />
          <circle cx="10.7" cy="8" r="3.2" fill="#E30A17" />
          <polygon points="14,8 16.5,6.8 15.6,9.2 14.5,6.6 16.6,8.8" fill="#FFFFFF" />
        </>
      )}
      {norm === 'pl' && (
        <>
          <rect width="24" height="8" fill="#FFFFFF" />
          <rect y="8" width="24" height="8" fill="#DC143C" />
        </>
      )}
      {norm === 'so' && (
        <>
          <rect width="24" height="16" fill="#4189DD" />
          <polygon points="12,3.5 13.2,6.8 16.7,6.8 13.9,8.8 15,12.2 12,10.1 9,12.2 10.1,8.8 7.3,6.8 10.8,6.8" fill="#FFFFFF" />
        </>
      )}
      {norm === 'fa' && (
        <>
          <rect width="24" height="5.33" fill="#239F40" />
          <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
          <rect y="10.67" width="24" height="5.33" fill="#DA0000" />
          <circle cx="12" cy="8" r="1.8" fill="#DA0000" />
        </>
      )}
      {norm === 'vi' && (
        <>
          <rect width="24" height="16" fill="#DA251D" />
          <polygon points="12,3.2 13.3,6.9 17.2,6.9 14,9.1 15.2,12.8 12,10.5 8.8,12.8 10,9.1 6.8,6.9 10.7,6.9" fill="#FFFF00" />
        </>
      )}
      {norm === 'ku' && (
        <>
          <rect width="24" height="5.33" fill="#ED2939" />
          <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
          <rect y="10.67" width="24" height="5.33" fill="#009A44" />
          <circle cx="12" cy="8" r="2.7" fill="#FACC15" />
        </>
      )}
      {norm === 'ti' && (
        <>
          <rect width="24" height="8" fill="#12AD2B" />
          <rect y="8" width="24" height="8" fill="#4189DD" />
          <polygon points="0,0 18,8 0,16" fill="#EA0437" />
          <circle cx="5.5" cy="8" r="2.3" stroke="#FACC15" strokeWidth="1.2" />
        </>
      )}
      {norm === 'lt' && (
        <>
          <rect width="24" height="5.33" fill="#FDB913" />
          <rect y="5.33" width="24" height="5.34" fill="#006A44" />
          <rect y="10.67" width="24" height="5.33" fill="#C1272D" />
        </>
      )}
      {norm === 'it' && (
        <>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#CE2B37" />
        </>
      )}
      {norm === 'pt' && (
        <>
          <rect width="9.6" height="16" fill="#006600" />
          <rect x="9.6" width="14.4" height="16" fill="#FF0000" />
          <circle cx="9.6" cy="8" r="2.6" fill="#FFCC00" />
        </>
      )}
      {!['no', 'en', 'de', 'es', 'fr', 'ar', 'uk', 'ru', 'th', 'tr', 'pl', 'so', 'fa', 'vi', 'ku', 'ti', 'lt', 'it', 'pt'].includes(norm) && (
        <>
          <rect width="24" height="16" fill="#10B981" />
          <circle cx="12" cy="8" r="5" stroke="#FFFFFF" strokeWidth="1.4" />
          <path d="M7 8H17M12 3V13" stroke="#FFFFFF" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
