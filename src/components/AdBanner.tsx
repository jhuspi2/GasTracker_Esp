import { useEffect } from 'react';

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

export const AdBanner: React.FC = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) { /* AdSense script not ready */ }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-1546554667679311"
      data-ad-slot="1313100756"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};
