import { readFileSync } from 'node:fs';
import { checkCompliance } from './domain/compliance';
import { createInvoice } from './domain/invoice';

/**
 * The static page around the app (#72): the head tags, the JSON-LD and the About section
 * live in src/index.html as plain HTML, so no component test sees them. These read the
 * source files back and keep them honest: one h1, the Res. 55 list in step with the
 * domain, the FAQ markup in step with the visible FAQ, one origin everywhere.
 */

const ORIGIN = 'https://facturath.athendat.site/';

const page = new DOMParser().parseFromString(readFileSync('src/index.html', 'utf8'), 'text/html');

const normalized = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

const meta = (selector: string) => page.head.querySelector(selector)?.getAttribute('content') ?? null;

interface FaqEntry {
  name: string;
  acceptedAnswer: { text: string };
}

function jsonLdNode(type: string): Record<string, unknown> {
  const script = page.head.querySelector('script[type="application/ld+json"]');
  const graph = (JSON.parse(script?.textContent ?? '{}') as { '@graph'?: Record<string, unknown>[] })['@graph'] ?? [];
  const node = graph.find((entry) => entry['@type'] === type);
  if (!node) {
    throw new Error(`index.html has no ${type} in its JSON-LD`);
  }
  return node;
}

describe('index.html', () => {
  it('describes the page in its head within the lengths a results page shows', () => {
    const title = normalized(page.title);
    const description = meta('meta[name="description"]') ?? '';

    expect(title).toContain('FACTURATH');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(meta('meta[property="og:title"]')).toBe(title);
  });

  it('names one canonical origin in the canonical link, the link preview, the JSON-LD and the crawl files', () => {
    expect(page.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(ORIGIN);
    expect(meta('meta[property="og:url"]')).toBe(ORIGIN);
    expect(meta('meta[property="og:image"]')).toBe(`${ORIGIN}og-image.png`);
    expect(jsonLdNode('WebApplication')['url']).toBe(ORIGIN);

    expect(readFileSync('public/robots.txt', 'utf8')).toContain(`Sitemap: ${ORIGIN}sitemap.xml`);
    const sitemap = new DOMParser().parseFromString(readFileSync('public/sitemap.xml', 'utf8'), 'application/xml');
    expect(Array.from(sitemap.getElementsByTagName('loc')).map((loc) => loc.textContent?.trim())).toEqual([ORIGIN]);
  });

  it('has exactly one h1, the About section title, and keeps that section off paper', () => {
    const headings = page.querySelectorAll('h1');
    const about = page.querySelector('section.about');

    expect(headings).toHaveLength(1);
    expect(about?.contains(headings[0])).toBe(true);
    expect(about?.getAttribute('aria-labelledby')).toBe(headings[0].id);
    expect(about?.hasAttribute('data-print-hide')).toBe(true);
  });

  it('lists the 13 data points of Res. 55/2021 exactly as the domain words them, in its order', () => {
    const labels = checkCompliance(createInvoice('index-html'), { showCarrier: true, showSignatures: true }).map(
      (entry) => entry.label,
    );
    const listed = Array.from(page.querySelectorAll('.about-norm > li')).map((item) => normalized(item.textContent));

    expect(listed).toEqual(labels);
  });

  it('marks up as FAQ only questions and answers the page shows, word for word', () => {
    const faq = page.querySelector('.about-faq');
    const shown = Array.from(faq?.querySelectorAll('h3') ?? []).map((question) => ({
      question: normalized(question.textContent),
      answer: normalized(question.nextElementSibling?.textContent),
    }));
    const marked = (jsonLdNode('FAQPage')['mainEntity'] as FaqEntry[]).map((entry) => ({
      question: normalized(entry.name),
      answer: normalized(entry.acceptedAnswer.text),
    }));

    expect(marked.length).toBeGreaterThan(0);
    expect(marked).toEqual(shown);
  });
});
