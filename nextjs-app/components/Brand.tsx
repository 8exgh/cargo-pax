import { SITE_NAME } from '@/lib/site';

/* The mark and the name as they appear together. The name is set in two
   tones so "Pax" reads as part of the product, not a typo after "Cargo";
   the mark itself is public/logo.svg, drawn by scripts/generate-icons.mjs. */

export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return <img src="/logo.svg" alt="" width={28} height={28} className={className} />;
}

export function Wordmark({ className = '' }: { className?: string }) {
  const split = SITE_NAME.indexOf('Pax');
  const [head, tail] = split > 0 ? [SITE_NAME.slice(0, split), SITE_NAME.slice(split)] : [SITE_NAME, ''];
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="text-gray-900">{head}</span>
      <span className="text-blue-700">{tail}</span>
    </span>
  );
}
