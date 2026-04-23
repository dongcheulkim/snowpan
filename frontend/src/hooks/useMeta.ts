import { useEffect } from 'react';

interface MetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
}

const SITE_NAME = '스노우판';
const DEFAULT_TITLE = '스노우판 - 스키/보드 중고거래 & 렌탈';
const DEFAULT_DESC = '스키 장비부터 레슨까지, 한눈에 비교하세요';
const DEFAULT_IMAGE = 'https://snowpan.vercel.app/icons/icon-512.svg';
const SITE_URL = 'https://snowpan.vercel.app';

// tag 이름별 selector 정보
type TagSpec = { attr: 'name' | 'property'; key: string };
const TAGS: Record<string, TagSpec> = {
  description: { attr: 'name', key: 'description' },
  'og:title': { attr: 'property', key: 'og:title' },
  'og:description': { attr: 'property', key: 'og:description' },
  'og:image': { attr: 'property', key: 'og:image' },
  'og:url': { attr: 'property', key: 'og:url' },
  'og:type': { attr: 'property', key: 'og:type' },
  'twitter:title': { attr: 'name', key: 'twitter:title' },
  'twitter:description': { attr: 'name', key: 'twitter:description' },
  'twitter:image': { attr: 'name', key: 'twitter:image' },
};

function setMeta(tagKey: keyof typeof TAGS, value: string) {
  const spec = TAGS[tagKey];
  const selector = `meta[${spec.attr}="${spec.key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(spec.attr, spec.key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

export function useMeta({ title, description, image, url, type = 'website' }: MetaOptions) {
  useEffect(() => {
    const finalTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESC;
    const finalImage = image || DEFAULT_IMAGE;
    const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

    const prevTitle = document.title;
    document.title = finalTitle;

    setMeta('description', finalDesc);
    setMeta('og:title', finalTitle);
    setMeta('og:description', finalDesc);
    setMeta('og:image', finalImage);
    setMeta('og:url', finalUrl);
    setMeta('og:type', type);
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDesc);
    setMeta('twitter:image', finalImage);
    setCanonical(finalUrl);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, image, url, type]);
}
