import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  canonical,
  noindex = false,
  ogTitle,
  ogDescription,
  ogImage = 'https://strangy.in/og-home.jpg',
  ogType = 'website',
  schema,
}) => {
  const fullTitle = title || 'Strangy — Random Video Chat with Strangers in India';
  const fullDesc = description || 'Join Strangy for live random video chat with strangers in India. Talk to girls, meet new people, and connect instantly. Free to start!';
  const fullCanonical = canonical || 'https://strangy.in';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <link rel="canonical" href={fullCanonical} />
      <link rel="alternate" hreflang="en-IN" href={fullCanonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || fullDesc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:site_name" content="Strangy" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || fullDesc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@StrangyIn" />

      {/* Schema JSON-LD */}
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
