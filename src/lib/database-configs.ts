/**
 * database-configs.ts
 *
 * Comprehensive configuration registry for 15+ academic research databases.
 * Each entry encapsulates the database's identity, CSS selectors used for
 * web-scraping / headless-browser extraction, and behavioural parameters
 * that govern request pacing, pagination, and timeouts.
 *
 * This is a **backend-only utility module** — no React or client-side code.
 * Import it from API routes, server actions, or mini-services.
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * CSS selectors that uniquely identify key DOM elements on a database's
 * search-results page.  Every selector must target the **current** layout
 * of the corresponding website (as of mid-2025).  If a selector changes
 * it should be updated here — all consuming code reads from this single
 * source of truth.
 */
export interface DatabaseSelectors {
  /** The main text input where a search query is typed. */
  search_input: string;

  /** The button (or link) that submits the search form. */
  search_button: string;

  /** Container element for a single search-result entry. */
  result_item: string;

  /** Anchor / heading that holds the result's title. */
  result_title: string;

  /** Element containing the list of author names. */
  result_authors: string;

  /** Element holding the publication year. */
  result_year: string;

  /** Paragraph or div with the abstract / snippet text. */
  result_abstract: string;

  /** Link pointing to a downloadable PDF (if available). */
  result_pdf_link: string;

  /** Element or data-attribute exposing the DOI. */
  result_doi: string;

  /** Element that displays the citation / reference count. */
  result_citations: string;

  /** Element with the journal or source name. */
  result_journal: string;

  /** Button or link that navigates to the next page of results. */
  pagination_next: string;

  /** Spinner, skeleton, or overlay shown while results are loading. */
  loading_indicator: string;
}

/**
 * Behavioural knobs that control how the scraper interacts with a database
 * — pacing, scroll behaviour, pagination limits, and authentication
 * requirements.
 */
export interface DatabaseBehavior {
  /** Minimum random delay (ms) between successive HTTP requests. */
  delay_min: number;

  /** Maximum random delay (ms) between successive HTTP requests. */
  delay_max: number;

  /** Whether the page should be scrolled to the bottom before extraction. */
  scroll_before_extract: boolean;

  /** Maximum number of result items available on a single page. */
  max_results_per_page: number;

  /** Maximum number of pages to traverse per search session. */
  total_pages: number;

  /** Milliseconds to wait before declaring a request timed out. */
  timeout_ms: number;

  /** Minimum gap (ms) between requests to respect rate-limiting. */
  rate_limit_ms: number;

  /** Whether the database requires the user to be logged in. */
  requires_login: boolean;

  /** URL of the login page (only meaningful when `requires_login` is true). */
  login_url: string;
}

/**
 * Full configuration for a single academic database.
 */
export interface DatabaseConfig {
  /** Unique slug used internally (e.g. key in `DATABASE_CONFIGS`). */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** Canonical homepage URL. */
  url: string;

  /** URL of the search page (often same as homepage). */
  searchUrl: string;

  /** Short description of what the database covers. */
  description: string;

  /** Category label — must match a value in `DATABASE_CATEGORIES`. */
  category: string;

  /** Name of a Lucide icon (for UI rendering). */
  icon: string;

  /** Whether the database is currently enabled for searching. */
  isEnabled: boolean;

  /** CSS selectors for the database's result pages. */
  selectors: DatabaseSelectors;

  /** Behavioural parameters for scraping. */
  behavior: DatabaseBehavior;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical list of database categories used across the application.
 */
export const DATABASE_CATEGORIES = [
  "General",
  "Open Access",
  "Specialized",
  "Indonesian",
] as const;

/**
 * Type alias for category values.
 */
export type DatabaseCategory = (typeof DATABASE_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Database configurations
// ---------------------------------------------------------------------------

/**
 * Master map of all supported academic databases, keyed by their unique `id`.
 *
 * **Adding a new database:**
 * 1.  Add a new entry to this record.
 * 2.  Make sure its `category` matches one of `DATABASE_CATEGORIES`.
 * 3.  Verify the CSS selectors against the live website.
 */
export const DATABASE_CONFIGS: Record<string, DatabaseConfig> = {
  // =========================================================================
  // 1. Google Scholar
  // =========================================================================
  google_scholar: {
    id: "google_scholar",
    name: "Google Scholar",
    url: "https://scholar.google.com",
    searchUrl: "https://scholar.google.com/scholar",
    description:
      "The world's largest academic search engine, indexing articles, theses, books, and conference papers across all disciplines.",
    category: "General",
    icon: "GraduationCap",
    isEnabled: true,
    selectors: {
      /** `#gs_hdr_tsi` — the central text input on the Scholar homepage. */
      search_input: "#gs_hdr_tsi",
      /** `.gs_cb_upd input[type="submit"]` or the `#gs_hdr_tsc` search icon button. */
      search_button: "#gs_hdr_tsc",
      /** `.gs_r` — each individual result block. */
      result_item: ".gs_r",
      /** `.gs_rt a` — the title link inside the result header. */
      result_title: ".gs_rt a",
      /** `.gs_a` — author names, venue, and snippet metadata line. */
      result_authors: ".gs_a",
      /** `.gs_a` again — the year is embedded within the author line text. */
      result_year: ".gs_a",
      /** `.gs_rs` — the snippet / abstract line below the title. */
      result_abstract: ".gs_rs",
      /** `.gs_or_ggsm a` — "PDF" or "[PDF]" link when available. */
      result_pdf_link: ".gs_or_ggsm a",
      /** `data-clk-doi` attribute on the result container, if present. */
      result_doi: "[data-clk-doi]",
      /** `.gs_fl a` — "Cited by N" link in the footer of each result. */
      result_citations: ".gs_fl a[href*='cites=']",
      /** `.gs_a` — journal/source name is part of the author metadata line. */
      result_journal: ".gs_a",
      /** `#pnnext` — the "Next >" page button at the bottom of results. */
      pagination_next: "#pnnext",
      /** `.gs_in_txt_gs` loading text, or check for absence of results. */
      loading_indicator: "#gs_res_ccl_mid",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 5000,
      scroll_before_extract: true,
      max_results_per_page: 10,
      total_pages: 10,
      timeout_ms: 30000,
      rate_limit_ms: 1500,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 2. Directory of Open Access Journals (DOAJ)
  // =========================================================================
  doaj: {
    id: "doaj",
    name: "Directory of Open Access Journals",
    url: "https://doaj.org",
    searchUrl: "https://doaj.org/search",
    description:
      "A community-curated directory of high-quality, open access, peer-reviewed journals and their articles.",
    category: "Open Access",
    icon: "Unlock",
    isEnabled: true,
    selectors: {
      /** `input[type="search"]` — the search box on the DOAJ search page. */
      search_input: "input[type='search']",
      /** `button[type="submit"]` — search submit button. */
      search_button: "button[type='submit']",
      /** `.search-result` — container for a single article result. */
      result_item: ".search-result",
      /** `.search-result .title a` — the article title link. */
      result_title: ".search-result .title a",
      /** `.search-result .biblio .authors` — comma-separated author list. */
      result_authors: ".search-result .biblio .authors",
      /** `.search-result .biblio .year` — publication year span. */
      result_year: ".search-result .biblio .year",
      /** `.search-result .abstract p` or `.search-result .text-over` — truncated abstract. */
      result_abstract: ".search-result .abstract",
      /** `.search-result .full-text a` — link to the full-text PDF. */
      result_pdf_link: ".search-result .full-text a",
      /** `.search-result .doi a` — DOI link. */
      result_doi: ".search-result .doi a",
      /** `.search-result .hits` — citation or hit count. */
      result_citations: ".search-result .hits",
      /** `.search-result .journal-title a` — source journal name. */
      result_journal: ".search-result .journal-title a",
      /** `.pagination .next a` — next page link in pagination. */
      pagination_next: ".pagination .next a",
      /** `.loading-spinner` or `.search-loading` — loading indicator. */
      loading_indicator: ".loading-spinner",
    },
    behavior: {
      delay_min: 1500,
      delay_max: 4000,
      scroll_before_extract: false,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 25000,
      rate_limit_ms: 1000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 3. Garuda (Indonesian Journals)
  // =========================================================================
  garuda: {
    id: "garuda",
    name: "Garuda",
    url: "https://garuda.kemdikbud.go.id",
    searchUrl: "https://garuda.kemdikbud.go.id/journal",
    description:
      "Indonesia's national journal portal managed by Kemdikbud, providing access to accredited Indonesian academic journals.",
    category: "Indonesian",
    icon: "Landmark",
    isEnabled: true,
    selectors: {
      /** `#search-input` — the main search text field. */
      search_input: "#search-input",
      /** `.btn-search` — the search button. */
      search_button: ".btn-search",
      /** `.list-journal-item` or `.article-item` — each result container. */
      result_item: ".list-journal-item",
      /** `.list-journal-item .title a` — journal or article title. */
      result_title: ".list-journal-item .title a",
      /** `.list-journal-item .author` — author line. */
      result_authors: ".list-journal-item .author",
      /** `.list-journal-item .year` — publication year. */
      result_year: ".list-journal-item .year",
      /** `.list-journal-item .abstract` — abstract or summary text. */
      result_abstract: ".list-journal-item .abstract",
      /** `.list-journal-item .pdf a` — link to the PDF file. */
      result_pdf_link: ".list-journal-item .pdf a",
      /** `.list-journal-item .doi` — DOI field. */
      result_doi: ".list-journal-item .doi",
      /** `.list-journal-item .cited` — citations count if present. */
      result_citations: ".list-journal-item .cited",
      /** `.list-journal-item .journal-name` — journal name. */
      result_journal: ".list-journal-item .journal-name",
      /** `.pagination .next` — next-page button. */
      pagination_next: ".pagination .next",
      /** `.loading` — loading overlay / spinner. */
      loading_indicator: ".loading",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 5000,
      scroll_before_extract: true,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 30000,
      rate_limit_ms: 2000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 4. ResearchGate
  // =========================================================================
  researchgate: {
    id: "researchgate",
    name: "ResearchGate",
    url: "https://www.researchgate.net",
    searchUrl: "https://www.researchgate.net/search",
    description:
      "A professional network for scientists and researchers to share papers, ask questions, and find collaborators.",
    category: "Social/Network",
    icon: "Users",
    isEnabled: true,
    selectors: {
      /** `input[type="text"].search-input` — the search box in the header. */
      search_input: "input[type='text'].search-input",
      /** `.search-submit` — search button next to the input. */
      search_button: ".search-submit",
      /** `.nova-legacy-e-list__item` — each search result card. */
      result_item: ".nova-legacy-e-list__item",
      /** `.nova-legacy-e-link--theme-bare` or `.nova-legacy-v-publication-item__title` — result title. */
      result_title: ".nova-legacy-v-publication-item__title",
      /** `.nova-legacy-v-person-inline-item` — author chip / inline list. */
      result_authors: ".nova-legacy-v-person-inline-item",
      /** `.nova-legacy-v-publication-item__meta-date` — year / date. */
      result_year: ".nova-legacy-v-publication-item__meta-date",
      /** `.nova-legacy-v-publication-item__description` — abstract snippet. */
      result_abstract: ".nova-legacy-v-publication-item__description",
      /** `.nova-legacy-e-link--theme-display` with PDF text — PDF download link. */
      result_pdf_link: "a[href*='.pdf']",
      /** `.nova-legacy-e-link--color-green` — DOI link. */
      result_doi: "a[href*='doi.org']",
      /** `.nova-legacy-v-publication-item__metrics` — read/citation count. */
      result_citations: ".nova-legacy-v-publication-item__metrics",
      /** `.nova-legacy-v-publication-item__journal` — source journal. */
      result_journal: ".nova-legacy-v-publication-item__journal",
      /** `.nova-legacy-c-pagination__item--next a` — next page. */
      pagination_next: ".nova-legacy-c-pagination__item--next a",
      /** `.nova-legacy-c-spinner` — loading spinner. */
      loading_indicator: ".nova-legacy-c-spinner",
    },
    behavior: {
      delay_min: 3000,
      delay_max: 7000,
      scroll_before_extract: true,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 35000,
      rate_limit_ms: 2500,
      requires_login: true,
      login_url: "https://www.researchgate.net/login",
    },
  },

  // =========================================================================
  // 5. ScienceOpen
  // =========================================================================
  scienceopen: {
    id: "scienceopen",
    name: "ScienceOpen",
    url: "https://www.scienceopen.com",
    searchUrl: "https://www.scienceopen.com/search",
    description:
      "A research and publishing network offering open access to over 90 million articles with smart search and collection tools.",
    category: "Open Access",
    icon: "BookOpen",
    isEnabled: true,
    selectors: {
      /** `input.search-query` — the main search input field. */
      search_input: "input.search-query",
      /** `button.search-btn` — search trigger button. */
      search_button: "button.search-btn",
      /** `.result-item` — each article result card. */
      result_item: ".result-item",
      /** `.result-item .title a` — article title link. */
      result_title: ".result-item .title a",
      /** `.result-item .authors` — author name list. */
      result_authors: ".result-item .authors",
      /** `.result-item .year` — publication year badge. */
      result_year: ".result-item .year",
      /** `.result-item .abstract-text` — truncated abstract. */
      result_abstract: ".result-item .abstract-text",
      /** `.result-item .full-text-link` — link to the open-access full text. */
      result_pdf_link: ".result-item .full-text-link",
      /** `.result-item .doi-link` — DOI anchor tag. */
      result_doi: ".result-item .doi-link",
      /** `.result-item .citations-count` — number of citations. */
      result_citations: ".result-item .citations-count",
      /** `.result-item .journal-name` — journal or source. */
      result_journal: ".result-item .journal-name",
      /** `.pagination li.next a` — next page link. */
      pagination_next: ".pagination li.next a",
      /** `.loading-overlay` — loading indicator. */
      loading_indicator: ".loading-overlay",
    },
    behavior: {
      delay_min: 1500,
      delay_max: 4000,
      scroll_before_extract: true,
      max_results_per_page: 20,
      total_pages: 5,
      timeout_ms: 25000,
      rate_limit_ms: 1200,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 6. PubMed
  // =========================================================================
  pubmed: {
    id: "pubmed",
    name: "PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov",
    searchUrl: "https://pubmed.ncbi.nlm.nih.gov",
    description:
      "A free resource from the US National Library of Medicine, indexing over 36 million citations for biomedical and life sciences literature.",
    category: "Specialized",
    icon: "HeartPulse",
    isEnabled: true,
    selectors: {
      /** `#id_term` or `input[id="term"]` — the PubMed search bar. */
      search_input: "#id_term",
      /** `.search-btn` or `button.search` — submit button. */
      search_button: "button.search",
      /** `.search-result-ct` or `article.search-result` — each result entry. */
      result_item: "article.search-result",
      /** `.doc-sum-title a` — the article title anchor. */
      result_title: ".doc-sum-title a",
      /** `.doc-sum-authors` — authors list. */
      result_authors: ".doc-sum-authors",
      /** `.doc-sum-journal-citation .citation-date` — publication year. */
      result_year: ".doc-sum-journal-citation .citation-date",
      /** `.full-view-snippet` — snippet / abstract preview. */
      result_abstract: ".full-view-snippet",
      /** `a[title="Free full text"]` — link to the free full text / PDF. */
      result_pdf_link: "a[title='Free full text']",
      /** `.doi a` — DOI link. */
      result_doi: ".doi a",
      /** `.citation-count` — "Cited by N" link. */
      result_citations: ".citation-count",
      /** `.doc-sum-journal-citation .journal` — journal name. */
      result_journal: ".doc-sum-journal-citation .journal",
      /** `a.pagination-next` — next-page button. */
      pagination_next: "a.pagination-next",
      /** `.loading-spinner` or `.search-msg` — loading / status indicator. */
      loading_indicator: ".search-msg",
    },
    behavior: {
      delay_min: 1000,
      delay_max: 3000,
      scroll_before_extract: false,
      max_results_per_page: 20,
      total_pages: 10,
      timeout_ms: 25000,
      rate_limit_ms: 1000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 7. IEEE Xplore
  // =========================================================================
  ieee_xplore: {
    id: "ieee_xplore",
    name: "IEEE Xplore",
    url: "https://ieeexplore.ieee.org",
    searchUrl: "https://ieeexplore.ieee.org/search/searchresult.jsp",
    description:
      "Delivering full-text access to the world's highest quality technical literature in engineering and technology from IEEE and IET.",
    category: "Specialized",
    icon: "Cpu",
    isEnabled: true,
    selectors: {
      /** `input#search-input` — the main IEEE Xplore search box. */
      search_input: "input#search-input",
      /** `button#search-button` — the search submit button. */
      search_button: "button#search-button",
      /** `.List-results-items .search-result` — each result card. */
      result_item: ".List-results-items .search-result",
      /** `.result-item h3 a` — article title link. */
      result_title: ".result-item h3 a",
      /** `.author-list a` — individual author links. */
      result_authors: ".author-list a",
      /** `.pub-delivery-date` or `.publisher-date` — publication year. */
      result_year: ".publisher-date",
      /** `.description` — abstract snippet. */
      result_abstract: ".description",
      /** `.stats-document-section a[href*='stamp.jsp']` — PDF link. */
      result_pdf_link: "a[href*='stamp.jsp']",
      /** `.doi a` or `a[href*='doi.org']` — DOI anchor. */
      result_doi: "a[href*='doi.org']",
      /** `.citation .stats-document` — citation count. */
      result_citations: ".citation .stats-document",
      /** `.publication-title a` — journal / conference name. */
      result_journal: ".publication-title a",
      /** `a.next-page` — next page link. */
      pagination_next: "a.next-page",
      /** `.loading-bar` — progress / loading indicator. */
      loading_indicator: ".loading-bar",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 6000,
      scroll_before_extract: true,
      max_results_per_page: 25,
      total_pages: 5,
      timeout_ms: 35000,
      rate_limit_ms: 2000,
      requires_login: true,
      login_url: "https://ieeexplore.ieee.org/Xplore/login.jsp",
    },
  },

  // =========================================================================
  // 8. Scopus
  // =========================================================================
  scopus: {
    id: "scopus",
    name: "Scopus",
    url: "https://www.scopus.com",
    searchUrl: "https://www.scopus.com/results/results.uri",
    description:
      "The largest abstract and citation database of peer-reviewed literature, covering scientific journals, books, and conference proceedings.",
    category: "General",
    icon: "Search",
    isEnabled: true,
    selectors: {
      /** `input#searchfield` — the Scopus search input. */
      search_input: "input#searchfield",
      /** `button#advSearch` or `#search` — search button. */
      search_button: "button#advSearch",
      /** `.searchResult` or `.docTile` — each result entry. */
      result_item: ".docTile",
      /** `.docTitle a` — result title link. */
      result_title: ".docTitle a",
      /** `.authorNames a` — author names. */
      result_authors: ".authorNames a",
      /** `.docYear` — publication year span. */
      result_year: ".docYear",
      /** `.docAbstract` or `.description` — abstract text. */
      result_abstract: ".docAbstract",
      /** `a[href*='pdf']` — PDF download link if available. */
      result_pdf_link: "a[href*='pdf']",
      /** `a[href*='doi.org']` — DOI link. */
      result_doi: "a[href*='doi.org']",
      /** `.citedByCount a` — "Cited by N" count. */
      result_citations: ".citedByCount a",
      /** `.sourceTitle a` — journal or source name. */
      result_journal: ".sourceTitle a",
      /** `a.nextPage` — next-page navigation link. */
      pagination_next: "a.nextPage",
      /** `.loadingIndicator` — loading spinner. */
      loading_indicator: ".loadingIndicator",
    },
    behavior: {
      delay_min: 2500,
      delay_max: 6000,
      scroll_before_extract: true,
      max_results_per_page: 20,
      total_pages: 5,
      timeout_ms: 35000,
      rate_limit_ms: 2000,
      requires_login: true,
      login_url: "https://www.scopus.com/search/form.uri?display=advanced",
    },
  },

  // =========================================================================
  // 9. Dimensions
  // =========================================================================
  dimensions: {
    id: "dimensions",
    name: "Dimensions",
    url: "https://app.dimensions.ai",
    searchUrl: "https://app.dimensions.ai/discover/publication",
    description:
      "The most comprehensive research database, linking publications, datasets, grants, patents, clinical trials, and policy documents.",
    category: "General",
    icon: "LayoutGrid",
    isEnabled: true,
    selectors: {
      /** `input.search-input` — the Dimensions search field. */
      search_input: "input.search-input",
      /** `button.search-button` — search submit button. */
      search_button: "button.search-button",
      /** `.search-result` — each result card. */
      result_item: ".search-result",
      /** `.search-result .title a` — article title anchor. */
      result_title: ".search-result .title a",
      /** `.search-result .authors span` — author name spans. */
      result_authors: ".search-result .authors span",
      /** `.search-result .pub-year` — publication year. */
      result_year: ".search-result .pub-year",
      /** `.search-result .abstract-text` — abstract or snippet. */
      result_abstract: ".search-result .abstract-text",
      /** `.search-result .open-access-link` — link to the open-access PDF. */
      result_pdf_link: ".search-result .open-access-link",
      /** `.search-result .doi a` — DOI link. */
      result_doi: ".search-result .doi a",
      /** `.search-result .citation-count` — number of citations. */
      result_citations: ".search-result .citation-count",
      /** `.search-result .source-title` — journal or source. */
      result_journal: ".search-result .source-title",
      /** `.pagination .next a` — next-page button. */
      pagination_next: ".pagination .next a",
      /** `.search-loading` — loading indicator. */
      loading_indicator: ".search-loading",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 5000,
      scroll_before_extract: true,
      max_results_per_page: 20,
      total_pages: 5,
      timeout_ms: 30000,
      rate_limit_ms: 1500,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 10. Semantic Scholar
  // =========================================================================
  semanticscholar: {
    id: "semanticscholar",
    name: "Semantic Scholar",
    url: "https://www.semanticscholar.org",
    searchUrl: "https://www.semanticscholar.org/search",
    description:
      "An AI-powered research tool that uses natural language processing to help scholars find relevant papers, augmented with TLDR summaries.",
    category: "General",
    icon: "Brain",
    isEnabled: true,
    selectors: {
      /** `input#search-input` — the Semantic Scholar search bar. */
      search_input: "input#search-input",
      /** `button[type="submit"]` — search submit button. */
      search_button: "button[type='submit']",
      /** `.search-result` or `article.cla-card` — each result card. */
      result_item: "article.cla-card",
      /** `.cl-paper-title a` — paper title link. */
      result_title: ".cl-paper-title a",
      /** `.cl-authors span` — author name spans. */
      result_authors: ".cl-authors span",
      /** `.cl-paper-meta .cl-paper-pub-date` — publication year. */
      result_year: ".cl-paper-pub-date",
      /** `.cl-paper-abstract` — abstract text. */
      result_abstract: ".cl-paper-abstract",
      /** `.cl-pdf-link a` or `a[href*='.pdf']` — PDF download link. */
      result_pdf_link: "a[href*='.pdf']",
      /** `a[href*='doi.org']` — DOI link. */
      result_doi: "a[href*='doi.org']",
      /** `.cl-citation-count` — "Cited by N" number. */
      result_citations: ".cl-citation-count",
      /** `.cl-paper-venue` — journal or conference venue. */
      result_journal: ".cl-paper-venue",
      /** `a.pagination-next` — next page link. */
      pagination_next: "a.pagination-next",
      /** `.loading-spinner` — loading spinner / skeleton. */
      loading_indicator: ".loading-spinner",
    },
    behavior: {
      delay_min: 1500,
      delay_max: 4000,
      scroll_before_extract: true,
      max_results_per_page: 10,
      total_pages: 10,
      timeout_ms: 25000,
      rate_limit_ms: 1000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 11. CORE
  // =========================================================================
  core: {
    id: "core",
    name: "CORE",
    url: "https://core.ac.uk",
    searchUrl: "https://core.ac.uk/search",
    description:
      "The world's largest collection of open access research papers, aggregating metadata and full texts from data providers worldwide.",
    category: "Open Access",
    icon: "Database",
    isEnabled: true,
    selectors: {
      /** `input.search-input` — the CORE search field. */
      search_input: "input.search-input",
      /** `button.search-submit` — search trigger. */
      search_button: "button.search-submit",
      /** `.search-result-item` — each result entry. */
      result_item: ".search-result-item",
      /** `.search-result-item .title a` — result title link. */
      result_title: ".search-result-item .title a",
      /** `.search-result-item .authors` — author names. */
      result_authors: ".search-result-item .authors",
      /** `.search-result-item .year` — publication year. */
      result_year: ".search-result-item .year",
      /** `.search-result-item .abstract` — abstract snippet. */
      result_abstract: ".search-result-item .abstract",
      /** `.search-result-item .download-link` — PDF download link. */
      result_pdf_link: ".search-result-item .download-link",
      /** `.search-result-item .doi` — DOI field. */
      result_doi: ".search-result-item .doi",
      /** `.search-result-item .citations` — citation count. */
      result_citations: ".search-result-item .citations",
      /** `.search-result-item .publisher` — publisher / journal name. */
      result_journal: ".search-result-item .publisher",
      /** `.pagination .next a` — next-page link. */
      pagination_next: ".pagination .next a",
      /** `.search-loading` — loading indicator. */
      loading_indicator: ".search-loading",
    },
    behavior: {
      delay_min: 1500,
      delay_max: 4000,
      scroll_before_extract: false,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 25000,
      rate_limit_ms: 1000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 12. BASE (Bielefeld Academic Search Engine)
  // =========================================================================
  base: {
    id: "base",
    name: "Bielefeld Academic Search Engine",
    url: "https://www.base-search.net",
    searchUrl: "https://www.base-search.net/Search/Results",
    description:
      "One of the world's most voluminous search engines for academic web resources, providing access to over 400 million documents.",
    category: "Open Access",
    icon: "Globe",
    isEnabled: true,
    selectors: {
      /** `input#searchinput` — BASE's main search input. */
      search_input: "input#searchinput",
      /** `button[type="submit"]` — search submit button. */
      search_button: "button[type='submit']",
      /** `.result` or `.search-result` — each result entry. */
      result_item: ".search-result",
      /** `.result-title a` — document title link. */
      result_title: ".result-title a",
      /** `.result-authors` — author name list. */
      result_authors: ".result-authors",
      /** `.result-year` — publication year. */
      result_year: ".result-year",
      /** `.result-abstract` — abstract snippet. */
      result_abstract: ".result-abstract",
      /** `.result-link-pdf a` — PDF download link (open-access). */
      result_pdf_link: ".result-link-pdf a",
      /** `.result-doi a` — DOI link. */
      result_doi: ".result-doi a",
      /** `.result-citations` — citation count if available. */
      result_citations: ".result-citations",
      /** `.result-journal` — journal / source name. */
      result_journal: ".result-journal",
      /** `.pagination .next a` — next-page link. */
      pagination_next: ".pagination .next a",
      /** `.loading` — loading spinner. */
      loading_indicator: ".loading",
    },
    behavior: {
      delay_min: 1500,
      delay_max: 4000,
      scroll_before_extract: false,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 25000,
      rate_limit_ms: 1200,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 13. Perpusnas (Indonesian National Library)
  // =========================================================================
  perpusnas: {
    id: "perpusnas",
    name: "Perpusnas",
    url: "https://opac.perpusnas.go.id",
    searchUrl: "https://opac.perpusnas.go.id",
    description:
      "The online public access catalog of the National Library of Indonesia, providing search across books, journals, and digital collections.",
    category: "Indonesian",
    icon: "Library",
    isEnabled: true,
    selectors: {
      /** `input#edit-keys` or `input[name="searchString"]` — the OPAC search input. */
      search_input: "input#edit-keys",
      /** `#edit-submit` — search submit button. */
      search_button: "#edit-submit",
      /** `.search-result` or `.item` — each catalog result. */
      result_item: ".search-result",
      /** `.search-result .title a` — title of the book/journal. */
      result_title: ".search-result .title a",
      /** `.search-result .author` — author name. */
      result_authors: ".search-result .author",
      /** `.search-result .year` — publication year. */
      result_year: ".search-result .year",
      /** `.search-result .summary` — brief summary. */
      result_abstract: ".search-result .summary",
      /** `.search-result .digital-link a` — link to digital version / PDF. */
      result_pdf_link: ".search-result .digital-link a",
      /** `.search-result .isbn` — ISBN / identifier field. */
      result_doi: ".search-result .isbn",
      /** `.search-result .citations` — citation count if available. */
      result_citations: ".search-result .citations",
      /** `.search-result .publisher` — publisher name. */
      result_journal: ".search-result .publisher",
      /** `.pager-next a` — next page link. */
      pagination_next: ".pager-next a",
      /** `.ajax-progress` — loading indicator. */
      loading_indicator: ".ajax-progress",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 5000,
      scroll_before_extract: false,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 30000,
      rate_limit_ms: 2000,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 14. CrossRef
  // =========================================================================
  crossref: {
    id: "crossref",
    name: "CrossRef",
    url: "https://search.crossref.org",
    searchUrl: "https://search.crossref.org/search",
    description:
      "A not-for-profit membership organization providing DOI registration and metadata services for scholarly publications worldwide.",
    category: "General",
    icon: "Link",
    isEnabled: true,
    selectors: {
      /** `input.search-input` — the CrossRef search bar. */
      search_input: "input.search-input",
      /** `button[type="submit"]` — search button. */
      search_button: "button[type='submit']",
      /** `.search-result-item` — each result entry. */
      result_item: ".search-result-item",
      /** `.search-result-item .title a` — article / work title link. */
      result_title: ".search-result-item .title a",
      /** `.search-result-item .authors` — author list. */
      result_authors: ".search-result-item .authors",
      /** `.search-result-item .year` — publication year. */
      result_year: ".search-result-item .year",
      /** `.search-result-item .abstract` — abstract text (if available). */
      result_abstract: ".search-result-item .abstract",
      /** `.search-result-item .full-text-link` — link to full text or PDF. */
      result_pdf_link: ".search-result-item .full-text-link",
      /** `.search-result-item .doi a` — DOI link (CrossRef's primary identifier). */
      result_doi: ".search-result-item .doi a",
      /** `.search-result-item .citations` — citation count via Crossref cited-by. */
      result_citations: ".search-result-item .citations",
      /** `.search-result-item .container-title` — journal or container title. */
      result_journal: ".search-result-item .container-title",
      /** `.pagination .next a` — next-page link. */
      pagination_next: ".pagination .next a",
      /** `.loading-spinner` — loading indicator. */
      loading_indicator: ".loading-spinner",
    },
    behavior: {
      delay_min: 1000,
      delay_max: 3000,
      scroll_before_extract: false,
      max_results_per_page: 20,
      total_pages: 5,
      timeout_ms: 20000,
      rate_limit_ms: 800,
      requires_login: false,
      login_url: "",
    },
  },

  // =========================================================================
  // 15. Microsoft Academic (archived)
  // =========================================================================
  microsoft_academic: {
    id: "microsoft_academic",
    name: "Microsoft Academic",
    url: "https://academic.microsoft.com",
    searchUrl: "https://academic.microsoft.com/search",
    description:
      "Previously a free academic search engine with citation data and entity recognition. Now archived; kept for historical reference and dataset access.",
    category: "General",
    icon: "Archive",
    isEnabled: false,
    selectors: {
      /** `input.mag-search-input` — the MA search field. */
      search_input: "input.mag-search-input",
      /** `button.mag-search-btn` — search button. */
      search_button: "button.mag-search-btn",
      /** `.paper-card` — each paper result card. */
      result_item: ".paper-card",
      /** `.paper-card .title a` — paper title link. */
      result_title: ".paper-card .title a",
      /** `.paper-card .authors a` — author name links. */
      result_authors: ".paper-card .authors a",
      /** `.paper-card .year` — publication year. */
      result_year: ".paper-card .year",
      /** `.paper-card .abstract` — abstract snippet. */
      result_abstract: ".paper-card .abstract",
      /** `.paper-card .pdf-link a` — PDF link. */
      result_pdf_link: ".paper-card .pdf-link a",
      /** `.paper-card .doi` — DOI field. */
      result_doi: ".paper-card .doi",
      /** `.paper-card .citation-count` — number of citations. */
      result_citations: ".paper-card .citation-count",
      /** `.paper-card .venue` — conference or journal name. */
      result_journal: ".paper-card .venue",
      /** `.page-next a` — next-page link. */
      pagination_next: ".page-next a",
      /** `.mag-spinner` — loading spinner. */
      loading_indicator: ".mag-spinner",
    },
    behavior: {
      delay_min: 2000,
      delay_max: 5000,
      scroll_before_extract: true,
      max_results_per_page: 10,
      total_pages: 5,
      timeout_ms: 30000,
      rate_limit_ms: 1500,
      requires_login: false,
      login_url: "",
    },
  },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns an array of all database configs that have `isEnabled` set to
 * `true`.  Useful for building UI selectors or driving bulk searches.
 *
 * @example
 * ```ts
 * const enabled = getEnabledDatabases();
 * // [{ id: 'google_scholar', ... }, { id: 'doaj', ... }, ...]
 * ```
 */
export function getEnabledDatabases(): DatabaseConfig[] {
  return Object.values(DATABASE_CONFIGS).filter((db) => db.isEnabled);
}

/**
 * Groups enabled databases by their `category` field, returning a record
 * that maps each category to an array of matching configs.
 *
 * Only categories with at least one enabled database will appear in the
 * returned object.
 *
 * @example
 * ```ts
 * const grouped = getDatabasesByCategory();
 * // {
 * //   General: [{ id: 'google_scholar', ... }, ...],
 * //   "Open Access": [{ id: 'doaj', ... }, ...],
 * //   ...
 * // }
 * ```
 */
export function getDatabasesByCategory(): Record<string, DatabaseConfig[]> {
  const result: Record<string, DatabaseConfig[]> = {};

  for (const db of getEnabledDatabases()) {
    const cat = db.category;
    if (!result[cat]) {
      result[cat] = [];
    }
    result[cat].push(db);
  }

  return result;
}

/**
 * Retrieves a single database configuration by its `id`.
 *
 * Returns `undefined` if no database with the given id exists.
 *
 * @param id - The unique slug of the database (e.g. `"pubmed"`).
 * @returns The matching `DatabaseConfig`, or `undefined`.
 *
 * @example
 * ```ts
 * const pubmed = getDatabaseConfig("pubmed");
 * // { id: 'pubmed', name: 'PubMed', ... }
 *
 * const missing = getDatabaseConfig("nonexistent");
 * // undefined
 * ```
 */
export function getDatabaseConfig(id: string): DatabaseConfig | undefined {
  return DATABASE_CONFIGS[id];
}
