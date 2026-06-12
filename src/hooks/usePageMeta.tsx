import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
}

const BASE_URL = "https://opticacrm.lovable.app";

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, key, name] = selector.match(/meta\[(name|property)="([^"]+)"\]/) || [];
    if (key && name) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const setCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/**
 * Sets per-page <title>, meta description, canonical, and Open Graph tags.
 * Ensures each route has unique SEO metadata.
 */
export const usePageMeta = ({ title, description, canonicalPath }: PageMetaOptions) => {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    document.title = fullTitle;

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);

    if (canonicalPath) {
      const url = `${BASE_URL}${canonicalPath}`;
      setCanonical(url);
      setMeta('meta[property="og:url"]', "content", url);
    }
  }, [title, description, canonicalPath]);
};
