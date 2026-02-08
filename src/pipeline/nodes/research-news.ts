import type { PipelineStateType } from "../state.js";

const FETCH_TIMEOUT = 10_000;
const MAX_PER_SOURCE = 5;

async function fetchLoadstarHeadlines(): Promise<string[]> {
  const res = await fetch("https://theloadstar.com/feed/", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  const xml = await res.text();

  const headlines: string[] = [];
  const titleRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
  let match: RegExpExecArray | null;
  while ((match = titleRegex.exec(xml)) !== null && headlines.length < MAX_PER_SOURCE) {
    headlines.push(`${match[1]!.trim()} (The Loadstar)`);
  }

  // Fallback: try plain <title> without CDATA
  if (headlines.length === 0) {
    const plainRegex = /<item>[\s\S]*?<title>(.*?)<\/title>/g;
    while ((match = plainRegex.exec(xml)) !== null && headlines.length < MAX_PER_SOURCE) {
      const text = match[1]!.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      if (text) headlines.push(`${text} (The Loadstar)`);
    }
  }

  return headlines;
}

async function fetchDcnHeadlines(): Promise<string[]> {
  const res = await fetch("https://www.thedcn.com.au/news/", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  const html = await res.text();

  const headlines: string[] = [];
  const headingRegex = /<h[23][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null && headlines.length < MAX_PER_SOURCE) {
    const text = match[1]!.replace(/<[^>]+>/g, "").trim();
    if (text) headlines.push(`${text} (DCN)`);
  }

  // Broader fallback: any <h2>/<h3> with an <a> inside
  if (headlines.length === 0) {
    const fallbackRegex = /<h[23][^>]*>\s*<a[^>]*>(.*?)<\/a>/gi;
    while ((match = fallbackRegex.exec(html)) !== null && headlines.length < MAX_PER_SOURCE) {
      const text = match[1]!.replace(/<[^>]+>/g, "").trim();
      if (text) headlines.push(`${text} (DCN)`);
    }
  }

  return headlines;
}

async function fetchFtaHeadlines(): Promise<string[]> {
  const res = await fetch("https://www.ftalliance.com.au/news/", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  const html = await res.text();

  const headlines: string[] = [];
  const headingRegex = /<h[23][^>]*>\s*<a[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null && headlines.length < MAX_PER_SOURCE) {
    const text = match[1]!.replace(/<[^>]+>/g, "").trim();
    if (text) headlines.push(`${text} (FTA)`);
  }

  return headlines;
}

export async function researchNews(
  state: PipelineStateType,
): Promise<Partial<PipelineStateType>> {
  console.log("Researching current industry news...");

  const fetchers = [
    { name: "Loadstar", fn: fetchLoadstarHeadlines },
    { name: "DCN", fn: fetchDcnHeadlines },
    { name: "FTA", fn: fetchFtaHeadlines },
  ];

  const results = await Promise.allSettled(fetchers.map((f) => f.fn()));

  const industryHeadlines: string[] = [];
  for (const [i, result] of results.entries()) {
    const source = fetchers[i]!;
    if (result.status === "fulfilled") {
      console.log(`  ${source.name}: ${result.value.length} headlines`);
      industryHeadlines.push(...result.value);
    } else {
      console.log(`  ${source.name}: failed (${result.reason})`);
    }
  }

  console.log(`Total headlines fetched: ${industryHeadlines.length}`);
  return { industryHeadlines };
}
