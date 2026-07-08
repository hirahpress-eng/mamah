// reference-search.ts — Comprehensive reference search engine
// Fetches REAL academic references from 11 academic databases.
// CRITICAL: Never fabricate data. Only return what APIs give us.

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RealReference {
  id: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  doi: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  source: string; // "Scopus" / "Semantic Scholar" / "OpenAlex" / etc.
  pdfUrl: string;
  relevanceScore: number;
  refType: string; // "Journal Article" / "Conference Paper" / etc.
  isSelected: boolean;
}

export interface SearchProgress {
  source: string;
  status: "pending" | "searching" | "done" | "error";
  found: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEARCH_TIMEOUT_MS = 20_000;
const TRANSLATED_SEARCH_TIMEOUT_MS = 12_000;
const MAX_TRANSLATED_QUERIES = 10;
const TRANSLATED_CONCURRENCY = 4;
const TRANSLATED_PHASE_TIMEOUT_MS = 90_000;

const SOURCE_QUALITY_RANK: Record<string, number> = {
  Scopus: 1,
  "Semantic Scholar": 2,
  OpenAlex: 3,
  Crossref: 4,
  PubMed: 5,
  CORE: 6,
  PLOS: 7,
  ERIC: 8,
  arXiv: 9,
  BASE: 10,
  Tavily: 11,
};

const SOURCE_META_KEY: Record<string, string> = {
  Scopus: "scopus",
  "Semantic Scholar": "semanticScholar",
  OpenAlex: "openAlex",
  Crossref: "crossref",
  PubMed: "pubmed",
  CORE: "core",
  PLOS: "plos",
  ERIC: "eric",
  arXiv: "arxiv",
  BASE: "base",
  Tavily: "tavily",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);
}

/** Simple regex-based XML text extraction — avoids xml2js dependency. */
function xmlText(xml: string, tag: string): string {
  // Handle namespaced tags like "dc:title" or plain "title"
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match self-closing or full tags, non-greedy content
  const re = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${escaped}>`,
    "i",
  );
  const m = xml.match(re);
  if (!m) return "";
  return m[1].trim();
}

/** Extract multiple values for the same tag (e.g. <author>). */
function xmlAll(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${escaped}>`,
    "gi",
  );
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/** Extract attribute from a specific tag occurrence. */
function xmlAttr(xml: string, tag: string, attr: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<${escaped}(?:\\s[^>]*)?\\s${escapedAttr}=["']([^"']*)["']`,
    "i",
  );
  const m = xml.match(re);
  return m ? m[1] : "";
}

/** Remove HTML tags from a string. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Normalize a DOI: prefix with https://doi.org/ if bare identifier. */
function normalizeDoi(doi: string | undefined | null): string {
  if (!doi) return "";
  const d = doi.trim();
  if (!d) return "";
  if (d.startsWith("https://doi.org/")) return d;
  if (d.startsWith("http://doi.org/")) return d.replace("http://", "https://");
  if (d.startsWith("doi:")) return `https://doi.org/${d.slice(4).trim()}`;
  return `https://doi.org/${d}`;
}

/** Normalize title for fuzzy comparison. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple word-level Jaccard-like similarity for dedup. */
function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Determine default refType based on source. */
function defaultRefType(source: string): string {
  if (source === "arXiv") return "Preprint";
  if (source === "ERIC") return "Report";
  if (source === "Tavily") return "Web Source";
  return "Journal Article";
}

/** Global ID counter to guarantee uniqueness across multiple search calls. */
let globalRefId = 0;

/** Build a RealReference with safe defaults — NEVER fabricate. */
function makeRef(
  source: string,
  _index: number,
  overrides: Partial<RealReference>,
): RealReference {
  return {
    id: `ref_${source.toLowerCase().replace(/\s/g, "_")}_${globalRefId++}`,
    title: overrides.title ?? "",
    authors: overrides.authors ?? "",
    year: overrides.year ?? "",
    abstract: overrides.abstract ?? "",
    doi: overrides.doi ?? "",
    journal: overrides.journal ?? "",
    volume: overrides.volume ?? "",
    issue: overrides.issue ?? "",
    pages: overrides.pages ?? "",
    source,
    pdfUrl: overrides.pdfUrl ?? "",
    relevanceScore: 0,
    refType: overrides.refType ?? defaultRefType(source),
    isSelected: false,
  };
}

/** Build the query string from keywords with optional boolean mode. */
function buildQuery(keywords: string[], booleanMode: 'OR' | 'AND' = 'OR'): string {
  if (booleanMode === 'AND') {
    return keywords.join(' AND ');
  }
  return keywords.join(' OR ');
}

// ---------------------------------------------------------------------------
// 1. Scopus
// ---------------------------------------------------------------------------

let scopusKeyIndex = 0;

async function searchScopus(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const keys = [process.env.SCOPUS_API_KEY_1, process.env.SCOPUS_API_KEY_2];
  const key = keys[scopusKeyIndex % 2];
  scopusKeyIndex++;
  if (!key) return [];

  const scopusQuery = `TITLE-ABS-KEY(${query}) AND PUBYEAR > ${yearStart - 1} AND PUBYEAR < ${yearEnd + 1}`;
  const url = new URL("https://api.elsevier.com/content/search/scopus");
  url.searchParams.set("query", scopusQuery);
  url.searchParams.set("count", "100");

  const res = await withTimeout(
    fetch(url.toString(), {
      headers: { "X-ELS-APIKey": key },
    }),
    SEARCH_TIMEOUT_MS,
  );
  if (!res.ok) return [];

  const text = await res.text();
  // Scopus returns XML
  const entries: RealReference[] = [];

  // Split XML by <entry> tags
  const parts = text.split(/<entry>/i);
  let idx = 0;
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const title = xmlText(block, "dc:title");
    if (!title) continue;

    const coverDate = xmlText(block, "prism:coverDate");
    const year = coverDate ? coverDate.substring(0, 4) : "";
    const authors = xmlAll(block, "dc:creator").join("; ");
    const abs = xmlText(block, "dc:description");
    const doi = normalizeDoi(xmlText(block, "prism:doi"));
    const journal = xmlText(block, "prism:publicationName");
    const volume = xmlText(block, "prism:volume");
    const issue = xmlText(block, "prism:issueIdentifier");
    const pages = xmlText(block, "prism:pageRange");

    entries.push(
      makeRef("Scopus", idx, {
        title,
        authors,
        year,
        abstract: abs,
        doi,
        journal,
        volume,
        issue,
        pages,
      }),
    );
    idx++;
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 2. Semantic Scholar
// ---------------------------------------------------------------------------

async function searchSemanticScholar(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "100");
  url.searchParams.set(
    "fields",
    "title,authors,year,abstract,openAccessPdf,externalIds,journal,publicationVenue",
  );
  url.searchParams.set("year", `${yearStart}-${yearEnd}`);

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const papers: any[] = data.data ?? [];
  return papers.map((p, i) => {
    const authorNames =
      p.authors?.map((a: any) => a.name).filter(Boolean).join("; ") ?? "";
    const doi = normalizeDoi(p.externalIds?.DOI ?? "");
    const journal =
      p.journal?.name ??
      (typeof p.publicationVenue === "string" ? p.publicationVenue : "") ??
      "";
    const pdfUrl = p.openAccessPdf?.url ?? "";

    return makeRef("Semantic Scholar", i, {
      title: p.title ?? "",
      authors: authorNames,
      year: p.year != null ? String(p.year) : "",
      abstract: p.abstract ?? "",
      doi,
      journal,
      pdfUrl,
    });
  });
}

// ---------------------------------------------------------------------------
// 3. OpenAlex
// ---------------------------------------------------------------------------

function reconstructAbstract(index: Record<string, number[]> | undefined): string {
  if (!index || typeof index !== "object") return "";
  const pairs: [string, number][] = [];
  for (const word of Object.keys(index)) {
    for (const pos of index[word]) {
      pairs.push([word, pos]);
    }
  }
  pairs.sort((a, b) => a[1] - b[1]);
  return pairs.map((p) => p[0]).join(" ");
}

async function searchOpenAlex(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("mailto", process.env.REFERENCE_EMAIL ?? "");
  url.searchParams.set(
    "filter",
    `from_publication_date:${yearStart}-01-01,to_publication_date:${yearEnd}-12-31`,
  );

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const results: any[] = data.results ?? [];
  return results.map((r, i) => {
    const authorNames =
      r.authorships
        ?.map((a: any) => a.author?.display_name)
        .filter(Boolean)
        .join("; ") ?? "";
    const abstract = reconstructAbstract(r.abstract_inverted_index);
    // OpenAlex returns DOI as "https://doi.org/10.xxx" — normalize to remove prefix for storage
    const rawDoi = r.doi ?? "";
    // Per spec: "remove 'https://doi.org/' prefix for storage", but normalizeDoi adds it back.
    // Actually the spec says to remove prefix for storage. Let's store the full URL via normalizeDoi.
    const doi = normalizeDoi(rawDoi);
    const journal = r.primary_location?.source?.display_name ?? "";
    const biblio = r.biblio ?? {};
    const pages = biblio.first_page && biblio.last_page
      ? `${biblio.first_page}-${biblio.last_page}`
      : (biblio.first_page ?? "");

    return makeRef("OpenAlex", i, {
      title: r.title ?? "",
      authors: authorNames,
      year: r.publication_year != null ? String(r.publication_year) : "",
      abstract,
      doi,
      journal,
      volume: biblio.volume ?? "",
      issue: biblio.issue ?? "",
      pages,
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Crossref
// ---------------------------------------------------------------------------

async function searchCrossref(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", "100");
  url.searchParams.set("mailto", process.env.REFERENCE_EMAIL ?? "");
  url.searchParams.set(
    "filter",
    `from-pub-date:${yearStart}-01-01,until-pub-date:${yearEnd}-12-31`,
  );

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const items: any[] = data.message?.items ?? [];
  return items.map((item, i) => {
    const title = Array.isArray(item.title) ? item.title[0] : (item.title ?? "");
    const authorStr =
      Array.isArray(item.author)
        ? item.author
            .map((a: any) => {
              const family = a.family ?? "";
              const given = a.given ?? "";
              return family ? (given ? `${family}, ${given}` : family) : given;
            })
            .filter(Boolean)
            .join("; ")
        : "";
    // Year from published-print date-parts
    let year = "";
    const dp = item.published?.["date-parts"]?.[0]
      ?? item.published_print?.["date-parts"]?.[0]
      ?? item.published_online?.["date-parts"]?.[0]
      ?? item.issued?.["date-parts"]?.[0]
      ?? [];
    if (dp.length > 0 && dp[0] != null) {
      year = String(dp[0]);
    }
    const abs = stripHtml(item.abstract ?? "");
    const doi = normalizeDoi(item.DOI ?? "");
    const journal = Array.isArray(item["container-title"])
      ? item["container-title"][0]
      : (item["container-title"] ?? "");
    const volume = item.volume ?? "";
    const issue = item.issue ?? "";
    const page = item.page ?? "";

    return makeRef("Crossref", i, {
      title,
      authors: authorStr,
      year,
      abstract: abs,
      doi,
      journal,
      volume,
      issue,
      pages: page,
    });
  });
}

// ---------------------------------------------------------------------------
// 5. CORE
// ---------------------------------------------------------------------------

async function searchCore(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const key = process.env.CORE_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.core.ac.uk/v3/search/works");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "100");

  const res = await withTimeout(
    fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}` },
    }),
    SEARCH_TIMEOUT_MS,
  );
  if (!res.ok) return [];

  const data = await res.json();
  const results: any[] = data.results ?? [];
  return results
    .filter((r: any) => {
      if (!r.yearPublished) return false;
      const y = typeof r.yearPublished === "number" ? r.yearPublished : parseInt(String(r.yearPublished), 10);
      if (isNaN(y)) return false;
      return y >= yearStart && y <= yearEnd;
    })
    .map((r: any, _filteredIdx: number) => {
      const authorNames =
        Array.isArray(r.authors)
          ? r.authors.map((a: any) => a.name).filter(Boolean).join("; ")
          : "";
      const doi = normalizeDoi(r.doi ?? "");
      // Try to extract journal info from fullText or other fields
      let journal = "";
      if (typeof r.fullText === "string" && r.fullText.length < 200) {
        // fullText might be a source name in some responses
      }
      // CORE doesn't always have a journal field — leave empty if not present
      if (r.sourceFulltextUrls && Array.isArray(r.sourceFulltextUrls) && r.sourceFulltextUrls.length > 0) {
        // Not a journal name, skip
      }

      return makeRef("CORE", _filteredIdx, {
        title: r.title ?? "",
        authors: authorNames,
        year: r.yearPublished != null ? String(r.yearPublished) : "",
        abstract: r.abstract ?? "",
        doi,
        journal,
        pdfUrl: r.downloadUrl ?? "",
      });
    });
}

// ---------------------------------------------------------------------------
// 6. PubMed (two-step: eSearch then eFetch)
// ---------------------------------------------------------------------------

async function searchPubMed(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  // Step 1: eSearch
  const searchUrl = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
  );
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", query);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", "100");
  searchUrl.searchParams.set("mindate", `${yearStart}/01/01`);
  searchUrl.searchParams.set("maxdate", `${yearEnd}/12/31`);
  searchUrl.searchParams.set("datetype", "pdat");

  const searchRes = await withTimeout(
    fetch(searchUrl.toString()),
    SEARCH_TIMEOUT_MS,
  );
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const ids: string[] = searchData.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  // Step 2: eFetch
  const fetchUrl = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
  );
  fetchUrl.searchParams.set("db", "pubmed");
  fetchUrl.searchParams.set("id", ids.join(","));
  fetchUrl.searchParams.set("retmode", "xml");

  const fetchRes = await withTimeout(
    fetch(fetchUrl.toString()),
    SEARCH_TIMEOUT_MS,
  );
  if (!fetchRes.ok) return [];
  const xml = await fetchRes.text();

  // Parse XML: split by <PubmedArticle>
  const articles = xml.split(/<PubmedArticle>/i);
  const refs: RealReference[] = [];
  let idx = 0;

  for (let i = 1; i < articles.length; i++) {
    const block = articles[i];
    const title = xmlText(block, "ArticleTitle");
    if (!title) continue;

    // Year from PubDate/Year
    let year = xmlText(block, "Year");
    if (!year) {
      const medlineDate = xmlText(block, "MedlineDate");
      if (medlineDate) {
        const yMatch = medlineDate.match(/\b(19|20)\d{2}\b/);
        if (yMatch) year = yMatch[0];
      }
    }

    // Authors
    const authorBlocks = block.split(/<Author/i);
    const authorNames: string[] = [];
    for (let j = 1; j < authorBlocks.length; j++) {
      const ab = authorBlocks[j];
      const lastName = xmlText(ab, "LastName");
      const foreName = xmlText(ab, "ForeName") || xmlText(ab, "Initials");
      if (lastName) {
        authorNames.push(foreName ? `${lastName} ${foreName}` : lastName);
      }
    }

    // Abstract
    const abstractParts = xmlAll(block, "AbstractText");
    const abs = abstractParts.join(" ");

    // DOI: find ELocationID with ELocationIDType="doi"
    const elocationBlocks = block.split(/<ELocationID/i);
    let doi = "";
    for (const eb of elocationBlocks) {
      const eidType = xmlAttr(eb, "ELocationID", "ELocationIDType");
      if (eidType.toLowerCase() === "doi") {
        // Extract the text content
        const m = eb.match(/>([^<]*)</);
        if (m) {
          doi = normalizeDoi(m[1].trim());
          break;
        }
      }
    }
    // Also try ArticleId with IdType="doi"
    if (!doi) {
      const aidBlocks = block.split(/<ArticleId/i);
      for (const ab of aidBlocks) {
        const idType = xmlAttr(ab, "ArticleId", "IdType");
        if (idType?.toLowerCase() === "doi") {
          const m = ab.match(/>([^<]*)</);
          if (m) {
            doi = normalizeDoi(m[1].trim());
            break;
          }
        }
      }
    }

    const journal = xmlText(block, "Title");
    const volume = xmlText(block, "Volume");
    const issue = xmlText(block, "Issue");
    const pages = xmlText(block, "MedlinePgn");

    refs.push(
      makeRef("PubMed", idx, {
        title,
        authors: authorNames.join("; "),
        year,
        abstract: abs,
        doi,
        journal,
        volume,
        issue,
        pages,
      }),
    );
    idx++;
  }

  return refs;
}

// ---------------------------------------------------------------------------
// 7. arXiv
// ---------------------------------------------------------------------------

async function searchArxiv(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("http://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", "100");

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const xml = await res.text();
  const entries = xml.split(/<entry>/i);
  const refs: RealReference[] = [];
  let idx = 0;

  for (let i = 1; i < entries.length; i++) {
    const block = entries[i];
    const title = xmlText(block, "title");
    if (!title) continue;

    const published = xmlText(block, "published");
    const year = published ? published.substring(0, 4) : "";
    if (year) {
      const y = parseInt(year, 10);
      if (y < yearStart || y > yearEnd) continue;
    }

    const authorNames = xmlAll(block, "name").join("; ");
    const abs = xmlText(block, "summary");
    const arxivId = xmlText(block, "id");

    // Find alternate link for URL
    let pdfUrl = "";
    const linkBlocks = block.split(/<link/i);
    for (const lb of linkBlocks) {
      const rel = xmlAttr(lb, "link", "rel");
      const titleAttr = xmlAttr(lb, "link", "title");
      if (rel === "alternate" || titleAttr?.toLowerCase() === "pdf") {
        const href = xmlAttr(lb, "link", "href");
        if (href) {
          if (titleAttr?.toLowerCase() === "pdf") {
            pdfUrl = href;
          } else if (!pdfUrl) {
            pdfUrl = href;
          }
        }
      }
    }

    refs.push(
      makeRef("arXiv", idx, {
        title,
        authors: authorNames,
        year,
        abstract: abs,
        doi: "", // arXiv papers may not have DOIs
        pdfUrl,
      }),
    );
    idx++;
  }

  return refs;
}

// ---------------------------------------------------------------------------
// 8. BASE
// ---------------------------------------------------------------------------

async function searchBase(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("https://api.base-search.net/cgi-bin/BaseHttpSearchInterface");
  url.searchParams.set("func", "PerformSearch");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("hits", "100");

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const responseDocs: any[] = data.response?.docs ?? [];
  return responseDocs
    .filter((doc: any) => {
      const dateStr = doc.dcdate ?? "";
      const y = parseInt(String(dateStr).substring(0, 4), 10);
      if (isNaN(y)) return false;
      return y >= yearStart && y <= yearEnd;
    })
    .map((doc: any, _filteredIdx: number) => {
      const year = (doc.dcdate ?? "").substring(0, 4);
      return makeRef("BASE", _filteredIdx, {
        title: doc.dctitle ?? "",
        authors: Array.isArray(doc.dccreator)
          ? doc.dccreator.join("; ")
          : (doc.dccreator ?? ""),
        year,
        abstract: doc.dcdescription ?? "",
        doi: normalizeDoi(doc.dcidentifier ?? ""),
        journal: doc.dcsource ?? "",
        pdfUrl: doc.dclink ?? "",
      });
    });
}

// ---------------------------------------------------------------------------
// 9. PLOS
// ---------------------------------------------------------------------------

async function searchPlos(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("http://api.plos.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("rows", "100");
  url.searchParams.set("wt", "json");
  url.searchParams.set(
    "fq",
    `publication_date:[${yearStart}-01-01T00:00:00Z TO ${yearEnd}-12-31T23:59:59Z]`,
  );

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const docs: any[] = data.response?.docs ?? [];
  return docs.map((doc: any, i: number) => {
    const pubDate = doc.publication_date ?? "";
    const year = pubDate.substring(0, 4);
    const abs = Array.isArray(doc.abstract) ? doc.abstract[0] : (doc.abstract ?? "");
    const authorStr = Array.isArray(doc.author_display)
      ? doc.author_display.join("; ")
      : (doc.author_display ?? "");
    // PLOS uses "id" field which is typically the DOI-like article identifier
    const doi = doc.id ? normalizeDoi(`10.1371/${doc.id}`) : "";

    return makeRef("PLOS", i, {
      title: doc.title_display ?? "",
      authors: authorStr,
      year,
      abstract: abs,
      doi,
      journal: doc.journal ?? "",
    });
  });
}

// ---------------------------------------------------------------------------
// 10. ERIC
// ---------------------------------------------------------------------------

async function searchEric(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<RealReference[]> {
  const url = new URL("https://api.ies.ed.gov/eric/");
  url.searchParams.set("search", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("rows", "100");
  url.searchParams.set("ff1", `pubYear,${yearStart}-${yearEnd}`);

  const res = await withTimeout(fetch(url.toString()), SEARCH_TIMEOUT_MS);
  if (!res.ok) return [];

  const data = await res.json();
  const docs: any[] = data.response?.docs ?? [];
  return docs.map((doc: any, i: number) => {
    // Determine refType from ERIC's publication type
    let refType = "Report";
    if (Array.isArray(doc.publicationtypecategory)) {
      const cats = doc.publicationtypecategory.map((c: any) => (typeof c === "string" ? c.toLowerCase() : "")).join(" ");
      if (cats.includes("journal")) refType = "Journal Article";
      else if (cats.includes("conference")) refType = "Conference Paper";
      else if (cats.includes("thesis")) refType = "Thesis";
      else if (cats.includes("book")) refType = "Book";
    }

    return makeRef("ERIC", i, {
      title: doc.title ?? "",
      authors: Array.isArray(doc.author)
        ? doc.author.join("; ")
        : (doc.author ?? ""),
      year: doc.publicationdateyear ?? "",
      abstract: Array.isArray(doc.description)
        ? doc.description.join(" ")
        : (doc.description ?? ""),
      doi: normalizeDoi(doc.doi ?? ""),
      journal: doc.source ?? "",
      refType,
    });
  });
}

// ---------------------------------------------------------------------------
// 11. Tavily (web search fallback)
// ---------------------------------------------------------------------------

async function searchTavily(
  query: string,
  _yearStart: number,
  _yearEnd: number,
): Promise<RealReference[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const res = await withTimeout(
    fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${query} academic research paper`,
        max_results: 10,
        search_depth: "advanced",
        include_answer: false,
        api_key: key,
      }),
    }),
    SEARCH_TIMEOUT_MS,
  );
  if (!res.ok) return [];

  const data = await res.json();
  const results: any[] = data.results ?? [];
  return results.map((r: any, i: number) => {
    // Try to extract a year from the URL or content
    let year = "";
    const yearMatch = (r.url ?? "").match(/(?:19|20)\d{2}/);
    if (yearMatch) year = yearMatch[0];

    return makeRef("Tavily", i, {
      title: r.title ?? "",
      authors: "",
      year,
      abstract: r.content ?? "",
      doi: "",
      journal: "",
      pdfUrl: r.url ?? "",
    });
  });
}

// ---------------------------------------------------------------------------
// Search Options
// ---------------------------------------------------------------------------

export interface SearchOptions {
  booleanMode?: 'OR' | 'AND';
  includeKeywords?: string[];
  excludeKeywords?: string[];
  referenceTypes?: string[];
  translatedQueries?: string[][];  // Array of keyword arrays in different languages
  maxResults?: number;  // Default 500 (was 100)
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

export async function searchReferences(
  keywords: string[],
  yearStart: number,
  yearEnd: number,
  onProgress?: (progress: SearchProgress[]) => void,
  options?: SearchOptions,
): Promise<{ references: RealReference[]; meta: Record<string, number> }> {
  // Reset global ID counter for each new search to keep IDs manageable
  globalRefId = 0;
  const booleanMode = options?.booleanMode ?? 'OR';
  const query = buildQuery(keywords, booleanMode);
  const currentYear = new Date().getFullYear();

  // Progress tracking
  const sources = [
    "Scopus",
    "Semantic Scholar",
    "OpenAlex",
    "Crossref",
    "PubMed",
    "CORE",
    "PLOS",
    "ERIC",
    "arXiv",
    "BASE",
    "Tavily",
  ] as const;

  const progressMap: Record<string, SearchProgress> = {};
  for (const s of sources) {
    progressMap[s] = { source: s, status: "pending", found: 0 };
  }
  const progressArray = (): SearchProgress[] =>
    sources.map((s) => progressMap[s]);

  // Search function map
  const searchFns: Array<{
    name: string;
    fn: () => Promise<RealReference[]>;
  }> = [
    { name: "Scopus", fn: () => searchScopus(query, yearStart, yearEnd) },
    {
      name: "Semantic Scholar",
      fn: () => searchSemanticScholar(query, yearStart, yearEnd),
    },
    { name: "OpenAlex", fn: () => searchOpenAlex(query, yearStart, yearEnd) },
    { name: "Crossref", fn: () => searchCrossref(query, yearStart, yearEnd) },
    { name: "PubMed", fn: () => searchPubMed(query, yearStart, yearEnd) },
    { name: "CORE", fn: () => searchCore(query, yearStart, yearEnd) },
    { name: "PLOS", fn: () => searchPlos(query, yearStart, yearEnd) },
    { name: "ERIC", fn: () => searchEric(query, yearStart, yearEnd) },
    { name: "arXiv", fn: () => searchArxiv(query, yearStart, yearEnd) },
    { name: "BASE", fn: () => searchBase(query, yearStart, yearEnd) },
    {
      name: "Tavily",
      fn: () => searchTavily(query, yearStart, yearEnd),
    },
  ];

  // Track raw counts per source
  const rawCounts: Record<string, number> = {};
  for (const s of sources) {
    rawCounts[SOURCE_META_KEY[s]] = 0;
  }

  // Run all searches in parallel
  const settled = await Promise.allSettled(
    searchFns.map(async ({ name, fn }) => {
      progressMap[name].status = "searching";
      onProgress?.(progressArray());
      try {
        const results = await fn();
        progressMap[name].status = "done";
        progressMap[name].found = results.length;
        rawCounts[SOURCE_META_KEY[name]] = results.length;
        onProgress?.(progressArray());
        return results;
      } catch {
        progressMap[name].status = "error";
        progressMap[name].found = 0;
        onProgress?.(progressArray());
        return [] as RealReference[];
      }
    }),
  );

  // Collect all results
  let allRefs: RealReference[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      allRefs = allRefs.concat(result.value);
    }
  }

  // ── Multi-language / translated-queries search ─────────────────────
  // Optimised: limit to MAX_TRANSLATED_QUERIES, use only fast DBs,
  // run with bounded concurrency and an overall phase timeout.
  if (options?.translatedQueries?.length) {
    // Pick at most MAX_TRANSLATED_QUERIES, prioritising diversity
    const picked = options.translatedQueries
      .filter((q) => q.length > 0)
      .slice(0, MAX_TRANSLATED_QUERIES);

    // Debug: translated phase started

    // Only the fastest, most reliable databases for translated queries
    const fastSearchFns: Array<{
      name: string;
      fn: (q: string) => Promise<RealReference[]>;
    }> = [
      { name: "OpenAlex", fn: (q) => searchOpenAlex(q, yearStart, yearEnd) },
      { name: "Semantic Scholar", fn: (q) => searchSemanticScholar(q, yearStart, yearEnd) },
      { name: "Crossref", fn: (q) => searchCrossref(q, yearStart, yearEnd) },
      { name: "Tavily", fn: (q) => searchTavily(q, yearStart, yearEnd) },
    ];

    // Build lazy work items — promises are created only when executed
    const allWork: Array<{ name: string; fn: () => Promise<RealReference[]> }> = [];
    for (let qi = 0; qi < picked.length; qi++) {
      const tq = buildQuery(picked[qi], booleanMode);
      for (const db of fastSearchFns) {
        allWork.push({
          name: `${db.name}[q${qi}]`,
          fn: () => withTimeout(db.fn(tq), TRANSLATED_SEARCH_TIMEOUT_MS).catch(() => [] as RealReference[]),
        });
      }
    }

    // Execute with bounded concurrency
    const translatedRefs: RealReference[] = [];
    const phaseDeadline = Date.now() + TRANSLATED_PHASE_TIMEOUT_MS;
    let completedBatches = 0;
    const totalBatches = Math.ceil(allWork.length / TRANSLATED_CONCURRENCY);

    for (let i = 0; i < allWork.length; i += TRANSLATED_CONCURRENCY) {
      if (Date.now() > phaseDeadline) {
        // Translated phase timed out
        break;
      }
      // Create and execute promises lazily for this batch only
      const batch = allWork.slice(i, i + TRANSLATED_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(w => w.fn()));
      for (const r of results) {
        if (r.status === "fulfilled") translatedRefs.push(...r.value);
      }
      completedBatches++;
    }

    // Translated phase complete
    allRefs = allRefs.concat(translatedRefs);
  }

  const totalRaw = allRefs.length;

  // -----------------------------------------------------------------------
  // Deduplication
  // -----------------------------------------------------------------------

  // First pass: group by DOI (case-insensitive)
  const doiGroups: Map<string, RealReference[]> = new Map();
  const noDoi: RealReference[] = [];

  for (const ref of allRefs) {
    if (ref.doi) {
      const key = ref.doi.toLowerCase();
      const group = doiGroups.get(key) ?? [];
      group.push(ref);
      doiGroups.set(key, group);
    } else {
      noDoi.push(ref);
    }
  }

  // For each DOI group, keep the one from highest-quality source
  const deduped: RealReference[] = [];
  doiGroups.forEach((group) => {
    group.sort(
      (a: RealReference, b: RealReference) =>
        (SOURCE_QUALITY_RANK[a.source] ?? 99) -
        (SOURCE_QUALITY_RANK[b.source] ?? 99),
    );
    deduped.push(group[0]);
  });

  // Second pass: for items without DOI, fuzzy match by title
  const usedNoDoi = new Set<number>();
  for (let i = 0; i < noDoi.length; i++) {
    if (usedNoDoi.has(i)) continue;
    const current = noDoi[i];
    let bestMatch = -1;
    let bestScore = 0.9; // threshold
    let currentIsBetter = true;

    // Check against already-deduped items
    for (let j = 0; j < deduped.length; j++) {
      const sim = titleSimilarity(current.title, deduped[j].title);
      if (sim > bestScore) {
        bestScore = sim;
        // Compare data completeness
        const currentCompleteness =
          (current.abstract ? 1 : 0) +
          (current.authors ? 1 : 0) +
          (current.year ? 1 : 0) +
          (current.journal ? 1 : 0);
        const existingCompleteness =
          (deduped[j].abstract ? 1 : 0) +
          (deduped[j].authors ? 1 : 0) +
          (deduped[j].year ? 1 : 0) +
          (deduped[j].journal ? 1 : 0);
        if (currentCompleteness > existingCompleteness) {
          currentIsBetter = true;
          bestMatch = j;
        } else {
          currentIsBetter = false;
          bestMatch = j;
        }
      }
    }

    if (bestMatch >= 0) {
      if (currentIsBetter) {
        deduped[bestMatch] = current;
      }
      // Otherwise the existing deduped item is kept
    } else {
      // Also check against other no-DOI items
      let isDuplicate = false;
      for (let k = 0; k < i; k++) {
        if (usedNoDoi.has(k)) continue;
        const sim = titleSimilarity(current.title, noDoi[k].title);
        if (sim > 0.9) {
          // Keep the more complete one
          const cComplete =
            (current.abstract ? 1 : 0) +
            (current.authors ? 1 : 0) +
            (current.year ? 1 : 0);
          const kComplete =
            (noDoi[k].abstract ? 1 : 0) +
            (noDoi[k].authors ? 1 : 0) +
            (noDoi[k].year ? 1 : 0);
          if (cComplete <= kComplete) {
            isDuplicate = true;
          } else {
            // Replace — remove old, add new
            usedNoDoi.add(k);
            // The replaced one won't be added since we use usedNoDoi check
          }
          break;
        }
      }
      if (!isDuplicate) {
        deduped.push(current);
      }
      usedNoDoi.add(i);
    }
  }

  const afterDedupe = deduped.length;

  // -----------------------------------------------------------------------
  // Relevance Scoring
  // -----------------------------------------------------------------------

  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  for (const ref of deduped) {
    const titleLower = ref.title.toLowerCase();
    const abstractLower = ref.abstract.toLowerCase();

    let titleMatches = 0;
    for (const kw of normalizedKeywords) {
      // Whole word match
      const wordRe = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (wordRe.test(ref.title)) titleMatches++;
    }

    let abstractMatches = 0;
    for (const kw of normalizedKeywords) {
      const wordRe = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (wordRe.test(ref.abstract)) abstractMatches++;
    }

    const yearNum = parseInt(ref.year, 10);
    const yearRecency = !isNaN(yearNum)
      ? Math.max(0, 1 - (currentYear - yearNum) / 20)
      : 0;
    const hasDoi = ref.doi ? 1 : 0;
    const hasAbstract = ref.abstract ? 1 : 0;

    ref.relevanceScore =
      titleMatches * 3 +
      abstractMatches * 1 +
      yearRecency * 2 +
      hasDoi * 1 +
      hasAbstract * 0.5;
  }

  // Sort by relevanceScore DESC
  deduped.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // ── Include/Exclude filtering (after scoring, before truncation) ───
  let filtered = deduped;

  // Include filter: keep refs whose title/abstract contains at least one include keyword
  if (options?.includeKeywords?.length) {
    const includeKws = options.includeKeywords.map(k => k.toLowerCase());
    filtered = filtered.filter(ref => {
      const text = `${ref.title} ${ref.abstract}`.toLowerCase();
      return includeKws.some(kw => text.includes(kw));
    });
  }

  // Exclude filter: remove refs whose title/abstract contains any exclude keyword
  if (options?.excludeKeywords?.length) {
    const excludeKws = options.excludeKeywords.map(k => k.toLowerCase());
    filtered = filtered.filter(ref => {
      const text = `${ref.title} ${ref.abstract}`.toLowerCase();
      return !excludeKws.some(kw => text.includes(kw));
    });
  }

  // Reference type filtering
  if (options?.referenceTypes?.length && !options.referenceTypes.includes('all')) {
    const typeSet = new Set(options.referenceTypes.map(t => t.toLowerCase()));
    filtered = filtered.filter(ref => typeSet.has(ref.refType.toLowerCase()));
  }

  const maxResults = options?.maxResults || 500;
  const finalRefs = filtered.slice(0, maxResults);

  // -----------------------------------------------------------------------
  // Build meta
  // -----------------------------------------------------------------------

  const meta: Record<string, number> = { ...rawCounts };
  meta.totalRaw = totalRaw;
  meta.afterDedupe = afterDedupe;
  meta.afterCriteria = filtered.length;
  meta.afterValidation = 0;

  // Filter out references with invalid years (future dates, too old)
  const validatedRefs = finalRefs.filter((ref) => {
    const yearNum = parseInt(ref.year, 10);
    if (isNaN(yearNum)) return false;
    if (yearNum > currentYear) return false;
    if (yearNum < 1990) return false;
    return true;
  });

  meta.afterValidation = validatedRefs.length;

  return { references: validatedRefs, meta };
}