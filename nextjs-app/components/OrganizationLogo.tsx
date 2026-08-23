'use client';

import { useEffect, useState } from 'react';

/* The logo is served only to the organization's own people, so it needs the
   bearer token an <img> cannot send - fetch it and hand the tag a blob. */
export function OrganizationLogo({
  hasLogo,
  version,
  name,
  className = 'h-7 w-7 rounded object-contain'
}: {
  hasLogo: boolean;
  version: number | null;
  name: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLogo) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(`/api/queries/organization-logo?v=${version ?? 0}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(response => (response.ok ? response.blob() : Promise.reject(new Error('no logo'))))
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasLogo, version]);

  if (src) {
    return <img src={src} alt={name} className={className} />;
  }
  return <img src="/logo.svg" alt="" className={className} />;
}
