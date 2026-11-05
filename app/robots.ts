import type { MetadataRoute } from 'next'

// AVK-PROD-03A (C6, I-1): interim-host robots policy. Crawling is allowed so crawlers can see the
// X-Robots-Tag: noindex header on next.avatark.ai; no sitemap until the separately authorized apex
// cut-over (a sitemap of noindex pages would contradict itself).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
  }
}
