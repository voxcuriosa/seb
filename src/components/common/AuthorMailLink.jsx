/**
 * Obfuscated mailto link for Christian Borchgrevink-Vigeland to prevent simple bot scraping.
 * The email string is reconstructed at runtime / on user interaction.
 */
import { useState } from 'react';

const USER = 'borchgrevink';
const DOMAIN = 'gmail.com';

export default function AuthorMailLink({
  label = 'Christian Borchgrevink-Vigeland',
  showEmail = false,
  subject = '',
  className = 'text-emerald-400 hover:text-emerald-300 underline font-semibold'
}) {
  const [clicked, setClicked] = useState(false);

  const getEmail = () => `${USER}@${DOMAIN}`;

  const handleClick = (e) => {
    e.preventDefault();
    setClicked(true);
    const email = getEmail();
    const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    window.location.href = `mailto:${email}${query}`;
  };

  return (
    <a
      href="#kontakt"
      onClick={handleClick}
      onFocus={() => setClicked(true)}
      title="Send e-post"
      className={className}
    >
      {label}
      {showEmail && (
        <span className="ml-1 text-slate-400 font-normal">
          ({clicked ? getEmail() : `${USER} [at] ${DOMAIN}`})
        </span>
      )}
    </a>
  );
}
