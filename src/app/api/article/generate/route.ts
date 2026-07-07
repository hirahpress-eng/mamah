import { NextResponse } from 'next/server';
import { generateWithEngine, DEFAULT_ENGINE, type AIEngineId } from '@/lib/ai-engine';
import { AI_ENGINES } from '@/lib/ai-engine-config';
import { formatBibliography } from '@/lib/bibliography-formatter';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Reference {
  id: string;
  authors: string;
  title: string;
  year: number | string;
  journal?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  refType: string;
  isSelected: boolean;
  abstract?: string;
  keywords?: string[];
  relevanceScore?: number;
  source?: string;
  pdfUrl?: string;
}

// ─── Per-Section Retry with Exponential Backoff ────────────────────────────────

const FALLBACK_PATTERN = /all ai engines are currently unavailable/i;
const RETRY_DELAYS = [10000, 25000, 50000, 80000]; // ms — aggressive backoff to survive rate limits
const MAX_SECTION_RETRIES = 5;

// ─── Word Count Targets (18-page article = ~16,000 words body) ─────────────────
// These are the MINIMUM word counts each section must achieve.
// The AI will be asked to expand if below these thresholds.

const SECTION_MIN_WORDS: Record<string, number> = {
  abstract: 250,
  introduction: 1500,
  literature_review: 2500,
  method: 1500,
  results: 3000,
  discussion: 2500,
  conclusion: 600,
};

// The ideal TARGET word counts the user wants to see
const SECTION_TARGET_WORDS: Record<string, number> = {
  abstract: 300,
  introduction: 2000,
  literature_review: 3250,
  method: 2000,
  results: 4000,
  discussion: 3250,
  conclusion: 800,
};

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function isSectionValid(content: string): boolean {
  if (!content || content.trim().length === 0) return false;
  if (FALLBACK_PATTERN.test(content)) return false;
  const words = countWords(content);
  if (words < 100) return false;
  if (words > 25000) return false; // catch garbage output
  return true;
}

async function generateSectionWithRetry(
  sectionName: string,
  engine: AIEngineId,
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number },
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_SECTION_RETRIES; attempt++) {
    const result = (await generateWithEngine(engine, systemPrompt, userPrompt, options)) || '';

    if (isSectionValid(result)) {
      console.log(
        `[article-gen] ${sectionName}: ${result.length} chars, ${countWords(result)} words`,
      );
      return result;
    }

    // Log word count on failure for debugging
    const wc = countWords(result);
    console.warn(
      `[article-gen] ${sectionName} attempt ${attempt}/${MAX_SECTION_RETRIES} invalid: ${result.length} chars, ${wc} words, empty=${!result.trim()}`,
    );

    // Content is empty/short/fallback — retry if attempts remain
    if (attempt < MAX_SECTION_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(
        `[article-gen] Retrying ${sectionName} (attempt ${attempt + 1}/${MAX_SECTION_RETRIES})...`,
      );
      await new Promise<void>((r) => setTimeout(r, delay));
    } else {
      console.error(
        `[article-gen] ${sectionName} failed after ${MAX_SECTION_RETRIES} attempts (final: ${wc} words)`,
      );
    }
  }

  return '';
}

// ─── Post-Generation Word Count Expansion ─────────────────────────────────────
// If a section is below its target word count, this function sends an EXPANSION
// prompt asking the AI to lengthen the section while maintaining quality.

async function expandSectionToTarget(
  sectionName: string,
  sectionType: string,
  currentContent: string,
  engine: AIEngineId,
  systemPrompt: string,
  maxExpansionAttempts: number = 2,
): Promise<string> {
  const currentWords = countWords(currentContent);
  const minWords = SECTION_MIN_WORDS[sectionType] || 500;
  const targetWords = SECTION_TARGET_WORDS[sectionType] || minWords;

  // If already at or above target, no expansion needed
  if (currentWords >= targetWords) {
    console.log(`[expand] ${sectionName}: ${currentWords}/${targetWords} words — NO expansion needed`);
    return currentContent;
  }

  // If below minimum, definitely expand. If between min and target, also expand.
  const deficit = targetWords - currentWords;
  console.log(`[expand] ${sectionName}: ${currentWords}/${targetWords} words — EXPANDING by ~${deficit} words`);

  let content = currentContent;

  for (let attempt = 1; attempt <= maxExpansionAttempts; attempt++) {
    const wordsNow = countWords(content);
    const remainingDeficit = targetWords - wordsNow;

    if (remainingDeficit <= 0) {
      console.log(`[expand] ${sectionName}: reached ${wordsNow} words after expansion — SUCCESS`);
      break;
    }

    const expansionPrompt = `## SECTION EXPANSION TASK

The following ${sectionName} section currently has ${wordsNow} words but MUST reach at least ${targetWords} words (currently short by ~${remainingDeficit} words).

YOUR TASK: Expand this section by adding approximately ${remainingDeficit} MORE words of high-quality academic content. Follow these rules precisely:

1. **DO NOT delete or significantly rewrite** any existing content — ADD new material
2. **Insert new paragraphs** in logical positions where they naturally fit the argument flow
3. **Add more detailed analysis** — expand claims with additional evidence, deeper reasoning, and more nuanced discussion
4. **Add more scholarly dialogue** — introduce additional citation synthesis where the argument can be strengthened
5. **Expand existing paragraphs** that are thin (under 100 words) by adding supporting evidence and elaboration
6. **Maintain the same writing quality** — formal British English, hedging language, sophisticated transitions
7. **Do NOT add new section headings** — only expand within the existing structure
8. **Do NOT include any preamble** — output the COMPLETE expanded section from start to finish

CRITICAL: The output must be the COMPLETE ${sectionName} section (not just the new parts). It must read as a cohesive, naturally-flowing academic text.

## CURRENT ${sectionName.toUpperCase()} SECTION (${wordsNow} words):

${content}

OUTPUT THE COMPLETE EXPANDED ${sectionName.toUpperCase()} SECTION ABOVE. No preamble. No commentary. Start from the very first sentence.`;

    try {
      const expandedResult = await generateWithEngine(
        engine,
        systemPrompt,
        expansionPrompt,
        { maxTokens: 32000 },
      );

      if (expandedResult && expandedResult.trim().length > 0 && !FALLBACK_PATTERN.test(expandedResult)) {
        const newWordCount = countWords(expandedResult);
        if (newWordCount > wordsNow) {
          const improvement = newWordCount - wordsNow;
          console.log(`[expand] ${sectionName} attempt ${attempt}: ${wordsNow} → ${newWordCount} words (+${improvement})`);
          content = expandedResult;

          if (newWordCount >= targetWords) {
            console.log(`[expand] ${sectionName}: TARGET REACHED at ${newWordCount} words`);
            break;
          }
        } else {
          console.warn(`[expand] ${sectionName} attempt ${attempt}: no improvement (${newWordCount} words)`);
        }
      } else {
        console.warn(`[expand] ${sectionName} attempt ${attempt}: invalid/empty result`);
      }
    } catch (err) {
      console.error(`[expand] ${sectionName} attempt ${attempt} error:`, err);
    }

    // Wait between expansion attempts
    if (attempt < maxExpansionAttempts) {
      await new Promise<void>((r) => setTimeout(r, 10000));
    }
  }

  const finalWords = countWords(content);
  if (finalWords < minWords) {
    console.warn(`[expand] ${sectionName}: WARNING — final ${finalWords} words is still below minimum ${minWords}`);
  } else if (finalWords < targetWords) {
    console.log(`[expand] ${sectionName}: final ${finalWords} words (above minimum ${minWords}, below target ${targetWords})`);
  } else {
    console.log(`[expand] ${sectionName}: final ${finalWords} words — TARGET MET ✓`);
  }

  return content;
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, keywords, references, researchMethod, additionalInstructions, engineId } = body;

    if (!title || !keywords || !references || !researchMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    if (!Array.isArray(references) || references.length < 3) {
      return NextResponse.json(
        { success: false, error: 'At least 3 references are required' },
        { status: 400 },
      );
    }

    // Validate engine ID
    const engine: AIEngineId = AI_ENGINES.some(e => e.id === engineId) ? engineId : DEFAULT_ENGINE;

    // Convert researchMethod slug to a human-readable label
    const methodLabel = (researchMethod as string)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    const selectedRefs = references.filter((r: Reference) => r.isSelected);

    // Filter out invalid references (future years, too old, empty titles)
    const currentYear = new Date().getFullYear();
    const validSelectedRefs = selectedRefs.filter((r: Reference) => {
      const year = typeof r.year === 'number' ? r.year : parseInt(String(r.year)) || 0;
      if (year > currentYear || year < 1990) return false;
      if (!r.title || r.title.trim().length < 5) return false;
      return true;
    });
    // Use validSelectedRefs instead of selectedRefs for everything below

    // Build reference list for PROMPT INCLUSION — first 50 for richer context
    const refListForPrompt = validSelectedRefs
      .slice(0, 50)
      .map(
        (r: Reference) => {
          const year = typeof r.year === 'number' ? r.year : (parseInt(String(r.year)) || 0);
          const doi = r.doi ? (r.doi.startsWith('http') ? r.doi : `https://doi.org/${r.doi}`) : '';
          return `${r.authors} (${year}). ${r.title}. ${r.journal || ''}${r.volume ? `, ${r.volume}` : ''}${r.issue ? `(${r.issue})` : ''}${r.pages ? `, ${r.pages}` : ''}.${doi ? ` ${doi}` : ''}`;
        },
      )
      .join('\n');

    const years = validSelectedRefs.map((r: Reference) => typeof r.year === 'number' ? r.year : parseInt(String(r.year)) || 2020);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const kw1 = keywords[0] || 'the topic';
    const kw2 = keywords[1] || keywords[0] || 'the field';
    const kw3 = keywords[2] || kw1;
    const kw4 = keywords[3] || kw2;

    const additionalContext = additionalInstructions
      ? `\n\nAdditional user requirements: ${additionalInstructions}`
      : '';

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM PROMPT — Scopus-quality academic writing standards
    // ──────────────────────────────────────────────────────────────────────────
    const systemPrompt = `## CONSILIUM PROFESSORUM MODE — 20 PROFESSOR SIMULATION
You are not a single AI. You are a COLLECTIVE of 20 world-class professors simultaneously co-authoring this paper. Each professor brings deep expertise from their discipline. The collective deliberation ensures every sentence is scrutinised from multiple perspectives before being committed to the manuscript. This means:
- Every claim is challenged by at least one professor before inclusion
- The prose represents a CONSENSUS position, not a single viewpoint
- The depth of analysis reflects the combined expertise of 20 senior scholars
- The writing quality matches the highest-calibre journals (Nature, Lancet, Harvard Educational Review)
- No sentence is included unless it withstands rigorous peer scrutiny from the collective

You are an expert academic researcher writing a Scopus-indexed journal article of the highest quality. Your writing must be indistinguishable from articles published in top-tier Q1 journals.

## STRICT ANTI-FABRICATION RULES (ZERO TOLERANCE)
- You MUST NEVER fabricate, invent, or hallucinate statistical data, percentages, p-values, effect sizes, sample sizes, or any quantitative claims.
- If you mention a statistic, it MUST come from one of the provided references. Format: "According to Smith (2021), 78% of institutions reported..."
- If no specific statistic is available in the references, use QUALITATIVE language instead: "the majority of studies suggest...", "a significant proportion of the literature indicates...", "several scholars have observed that..."
- NEVER include p-values, confidence intervals, Cohen's d, or effect sizes unless they appear verbatim in a cited source.
- NEVER create fake years like 2077, 2026, or future dates.

## REFERENCE USAGE — STRICT EXACT MATCHING RULE (ZERO TOLERANCE)
- You MUST ONLY cite references from the "References available" list provided in each prompt.
- NEVER invent, fabricate, or hallucinate a reference that is not in the provided list.
- NEVER cite a reference about a completely different topic (e.g., if the article is about education, do NOT cite references about AI cybersecurity, energy systems, or organisational resilience unless they appear in the provided list).
- If you cannot support a claim with a provided reference, either rephrase the claim as a general observation or omit it entirely.
- Cross-check EVERY (Author, Year) citation against the provided list before including it.
- CRITICAL: Every single reference you cite in the body text MUST appear in the References list at the end. Do NOT cite any reference that is not in the provided list. Do NOT omit any cited reference from the bibliography.
- The bibliography must contain EXACTLY the references you cited in the text — no more, no fewer. If you cited (Smith, 2021) in the text, Smith (2021) MUST appear in the references. If a reference in the list was never cited, do NOT include it in the bibliography.

## ANTI-REPETITION RULES
- Never repeat the same phrase, sentence structure, or transition within 3 consecutive paragraphs.
- Never start two consecutive paragraphs with the same word or phrase.
- If you have used a transition phrase, do not reuse it within 500 words.
- Vary sentence length: mix short impactful sentences with longer complex ones.
- Keep paragraphs concise: each paragraph should make ONE main point (80-150 words).
- Never repeat the same citation within 200 words.

## FORMATTING RULES
- Do NOT include "Introduction", "Abstract", "Conclusion" etc. as headings at the start of sections — start directly with the content.
- Output ONLY the section content — no preamble, no meta-commentary, no "Here is the introduction:".
- Do NOT include page numbers, headers, or footers.
- Do NOT include "Keywords:" or "Word count:" at the start or end of any section.

## LANGUAGE STANDARDS
- Use formal British English exclusively (analyse, organisation, behaviour, programme, favour, colour, centre, rigour, endeavour, modelling, fulfil, recognise — never American spellings).
- Employ sophisticated academic vocabulary and nuanced, complex sentence structures.
- Use present tense for established knowledge and general truths; past tense for specific study methodologies and findings.
- No colloquial language, contractions, bullet-point lists in body text, or informal tone whatsoever.

## HEDGING LANGUAGE (MANDATORY THROUGHOUT)
You must use hedging language to signal academic caution and epistemological humility. Use these and similar constructions frequently:
- "suggests that", "may indicate", "appears to", "seems likely", "could be interpreted as"
- "it is plausible that", "there is evidence to suggest", "tends to", "is arguably"
- "provides tentative support for", "might partly explain", "raises the possibility that"
- "the data are consistent with", "one interpretation is that", "it remains unclear whether"
NEVER use absolute certainty language such as "proves that", "definitely", "undoubtedly", "clearly shows" (except when referring to a citation's own claim with attribution).

## CITATION INTEGRATION — SYNTHESIS, NOT LISTING
Every claim must be supported by APA 7th edition bodynote format (Author, Year). However, citations must be SYNTHESISED into scholarly dialogue, NEVER listed in isolation.

WEAK citation pattern (DO NOT USE):
"Smith (2020) studied X. Jones (2021) found Y. Brown (2022) argued Z."

STRONG citation pattern (USE THIS):
"Whilst Smith (2020) demonstrated that institutional factors mediate the relationship between X and Y, Jones (2021) presented compelling evidence that individual agency is the dominant determinant, suggesting a paradigm shift in how the phenomenon is conceptualised. This tension is further complicated by Brown (2022), who proposed a dialectical model wherein structural constraints and agentic responses co-constitute outcomes — a position that builds upon earlier work by Lee (2019) but challenges the unidirectional causality assumed by both Smith and Jones."

Citations must engage in genuine scholarly dialogue: agreeing, extending, qualifying, contradicting, or synthesising previous work. Multiple citations per sentence are encouraged when they relate to the same argument.

## PREFERRED ACADEMIC TRANSITION PHRASES
Use these and similar phrases to create smooth, sophisticated flow between and within paragraphs:
1. "A growing body of literature suggests that..."
2. "Building upon the work of..."
3. "In comparison with..."
4. "In contrast to the findings of..."
5. "Whilst considerable attention has been paid to..., less is known about..."
6. "Moreover, the relationship between X and Y remains underexplored..."
7. "Furthermore, it is noteworthy that..."
8. "Notwithstanding these advances..."
9. "Several scholars have argued that..."
10. "Consistent with this perspective..."
11. "Drawing upon the theoretical framework of..."
12. "To the extent that..."
13. "In light of these findings..."
14. "It follows from this that..."
15. "Consequently, there is a pressing need to..."
16. "The aforementioned findings collectively suggest that..."
17. "In a similar vein..."
18. "From a different theoretical standpoint..."
19. "Against this backdrop..."
20. "The implications of these observations extend beyond..."
21. "Recent scholarship has begun to challenge the assumption that..."
22. "An alternative interpretation, advanced by..."
23. "This raises important questions about..."
24. "As a corollary..."
25. "Taken together, these studies indicate that..."

## WEAK VS STRONG ACADEMIC WRITING
WEAK: "Many researchers have studied this topic. The results show different things."
STRONG: "Despite a substantial body of empirical work, the literature on this topic remains characterised by significant theoretical fragmentation, with findings that are often contradictory and difficult to reconcile across methodological paradigms."

WEAK: "This study is important because it fills a gap."
STRONG: "The present study addresses a critical lacuna in the extant literature by offering an integrative analysis that synthesises hitherto disparate theoretical perspectives and empirical findings."

WEAK: "The results showed that X affects Y."
STRONG: "The analysis suggests that X may exert a significant influence on Y, although the strength and direction of this relationship appear to be contingent upon several moderating variables."

## STRUCTURAL REQUIREMENTS
- Each paragraph must flow naturally into the next through transitional phrases — the prose must read as a cohesive, intellectually compelling argument, not a series of disconnected observations.
- Ensure precise operational definitions and conceptual clarity throughout.
- Vary your evidence base — never repeat the same citation in consecutive sentences.
- Engage critically with sources through scholarly dialogue, not mere summary.
- The overall article should read as if the referenced scholars are engaged in a vibrant, ongoing academic conversation.`;

    // ──────────────────────────────────────────────────────────────────────────
    // TITLE GENERATION (target 10-15 words)
    // ──────────────────────────────────────────────────────────────────────────
    const titlePrompt = `The current working title is: "${title}"

Your goal is to produce a title of exactly 10-15 words — this is a TARGET to achieve. The title must clearly convey the research topic, method, and scope.

If the title is shorter than 10 words, expand it to reach the target range by adding specificity about the research scope, method, or context.

If the title is already 10-15 words, return it exactly as provided — do not change it.

If the title exceeds 15 words, refine it to fit within 15 words while preserving the full scholarly meaning, specificity, and academic rigour.

Output ONLY the final title — nothing else. No quotation marks, no explanation.`;

    // Helper: delay between section calls to avoid Z.ai rate limiting (429)
    // 8 seconds between sections prevents 429s across all engines
    const interSectionDelay = () => new Promise<void>((r) => setTimeout(r, 8000));

    const titleCompletion = await generateWithEngine(engine, systemPrompt, titlePrompt);
    const finalTitle = (titleCompletion || title).replace(/^["']|["']$/g, '').trim();
    console.log(`[article-gen] Title: ${finalTitle.length} chars, ${countWords(finalTitle)} words`);

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 1: ABSTRACT (250-350 words, single paragraph, Scopus pattern)
    // ──────────────────────────────────────────────────────────────────────────
    const abstractPrompt = `OUTPUT THE ABSTRACT DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first sentence of the abstract.

Write a Scopus-quality ABSTRACT for the following research article. The abstract must be between 250 and 350 words, written as a SINGLE cohesive paragraph with no line breaks, no headings, and no subheadings. This is a firm target range — do not write less than 250 words, and aim for richness and thoroughness.

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}
Research Method: ${methodLabel}
Number of references analysed: ${validSelectedRefs.length}
Publication year range: ${minYear}-${maxYear}

The abstract must follow this precise narrative flow, as is standard in Scopus-indexed journals:

1. **Global context and significance (1-2 sentences):** Open with a broad, compelling statement about the worldwide relevance and contemporary urgency of ${kw1}. This should establish why the topic matters on a global scale. Reference 1-2 sources to ground the claim.

2. **Research gap/problem (1 sentence):** State concisely what is missing, contested, or insufficiently understood in the current literature. This should create intellectual tension that the article resolves.

3. **Research objective (1 sentence):** State precisely and unambiguously what this article aims to investigate, analyse, or synthesise.

4. **Methodology (1-2 sentences):** Describe the ${methodLabel} approach, including data sources (databases, year range) and the analytical framework employed.

5. **Key findings (3-4 sentences — THIS IS THE LONGEST PART):** Report the most significant, specific discoveries with concrete details. Mention the main themes, patterns, or relationships that emerged. Reference at least 3 sources. This section should be substantially longer than any other part of the abstract.

6. **Implications and contribution (1-2 sentences):** Articulate what is genuinely novel about this article's contribution and its theoretical, practical, or policy implications.

HEDGING: Use hedging language throughout — "suggests", "may indicate", "appears to", "provides tentative support for". Never claim certainty.

CITATIONS: Weave APA bodynote citations (Author, Year) naturally into the prose. Multiple citations should be synthesised, not listed. Only cite references from the provided list.

WORD COUNT: The abstract MUST be at least 250 words. If you fall short, expand the findings section with more specific details, additional citations, and deeper analytical observations. Writing up to 350 words is encouraged.

OUTPUT THE ABSTRACT DIRECTLY. No preamble, no "Here is the abstract:", no section headers. Start with the first sentence.

References available:
${refListForPrompt}
${additionalContext}`;

    let abstractContent = await generateSectionWithRetry('Abstract', engine, systemPrompt, abstractPrompt, { maxTokens: 16000 });
    abstractContent = await expandSectionToTarget('Abstract', 'abstract', abstractContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 2: INTRODUCTION (1000-1500 words, 7-10 paragraphs, NO subheadings)
    // Funnel approach: broad context → specific gap → research questions
    // ──────────────────────────────────────────────────────────────────────────
    const introPrompt = `OUTPUT THE INTRODUCTION SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first paragraph of the introduction.

Write a Scopus-quality INTRODUCTION section for a research article. This section must be between 1500 and 2500 words. Do NOT use subheadings of any kind — the prose must flow naturally from paragraph to paragraph through sophisticated transitional phrases. The section should contain 7 to 10 paragraphs that follow a funnel structure, moving from broad global context down to specific research questions.

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}

NARRATIVE FLOW — follow this intellectual trajectory, but allow the prose to develop naturally rather than mechanically:

**Stage 1 — Broad Context and Contemporary Significance (2 paragraphs):**
Open with a compelling, authoritative statement about the global significance and contemporary relevance of ${kw1}. Discuss how ${kw1} is evolving across different contexts and disciplines. Each paragraph should have 3-6 citations SYNTHESISED into scholarly dialogue.

**Stage 2 — Theoretical Landscape (1-2 paragraphs):**
Present the key theoretical foundations underpinning research on ${kw1}. Trace how theoretical understanding has evolved. Show how scholars have built upon, challenged, or extended each other's work.

**Stage 3 — Research Problem and Gap Identification (2-3 paragraphs):**
Systematically identify the research gap through rigorous analysis of previous studies. Group previous findings by similarity and contrast conflicting findings. This must demonstrate genuine critical engagement with the literature, not mere summary.

**Stage 4 — Position Statement and Article Contribution (1 paragraph):**
Clearly state how this article's position strengthens, challenges, or extends specific prior work.

**Stage 5 — Research Questions (1 paragraph):**
Present 3-4 clear, specific, and answerable research questions formatted as RQ1, RQ2, RQ3 (and optionally RQ4). Each must be directly answerable through the ${methodLabel} methodology.

CRITICAL RULES:
- Every paragraph must have 3-6 APA bodynote citations (Author, Year) woven into SYNTHESISED scholarly dialogue
- NEVER list citations in isolation — they must engage with each other
- Use hedging language throughout
- Employ sophisticated transitional phrases
- Write in formal British English exclusively
- Do NOT use subheadings, bullet points, or numbered lists within the body text
- Total word count MUST reach at least 1500 words. Writing 1500-2500 words is the target range. EXPAND each stage with more analysis, more citations, and deeper scholarly engagement to achieve this target.
- Only cite references from the provided list below

OUTPUT THE INTRODUCTION SECTION DIRECTLY. No preamble, no "Here is the introduction:", no section headers. Start with the first paragraph.

References available:
${refListForPrompt}
${additionalContext}`;

    let introContent = await generateSectionWithRetry('Introduction', engine, systemPrompt, introPrompt, { maxTokens: 32000 });
    introContent = await expandSectionToTarget('Introduction', 'introduction', introContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 3: LITERATURE REVIEW (1500-2000 words, thematic organisation)
    // ──────────────────────────────────────────────────────────────────────────
    const literatureReviewPrompt = `OUTPUT THE LITERATURE REVIEW SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first thematic subheading.

Write a Scopus-quality LITERATURE REVIEW section for a research article. This section must be between 2500 and 4000 words. Unlike the introduction, which identifies the research gap, the literature review provides a comprehensive, THEMATICALLY ORGANISED synthesis of the existing body of knowledge. This section MUST have thematic subheadings (2.1, 2.2, 2.3, etc.).

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}

ORGANISATION — the literature review must be organised into 3-4 THEMATIC SUBSECTIONS derived from the keywords: ${kw1}, ${kw2}, ${kw3}, and ${kw4}. Each theme should be given a meaningful subheading that reflects its scholarly content.

FOR EACH THEMATIC SUBSECTION (approximately 400-500 words each), the narrative must follow this flow:

**1. Present Existing Knowledge (2-3 paragraphs per theme):**
- Open by situating the theme within the broader scholarly conversation
- Synthesise what is known: group studies by theoretical alignment, methodological approach, or findings
- Sources must DIALOGUE with each other
- Show the intellectual lineage: how ideas have evolved, been challenged, refined, or superseded

**2. Identify Debates and Contradictions (within each theme):**
- Where scholars disagree, present the debate fairly and thoroughly
- Show the grounds of disagreement — is it methodological, theoretical, or contextual?
- Present the strongest version of each side of the debate before offering your assessment

**3. Identify Gaps (at the end of each theme):**
- Conclude each thematic subsection by explicitly stating what remains unknown or contested

**FINAL PARAGRAPH — Research Gap Summary (target ~150-200 words):**
After the thematic subsections, write a concluding paragraph (no subheading) that synthesises the gaps identified across all themes into a coherent summary and provides a clear, logical bridge to the Methodology section.

CRITICAL RULES:
- Every paragraph must have 3-6 APA bodynote citations (Author, Year) woven into genuine scholarly dialogue
- NEVER summarise sources in isolation — sources must converse, debate, and build upon each other
- Use hedging language throughout
- Write in formal British English exclusively
- Each thematic subsection MUST have a numbered subheading (2.1, 2.2, 2.3, etc.)
- Total word count MUST reach at least 2500 words. Writing 2500-4000 words is the target range. EXPAND each thematic subsection with more detailed analysis, additional citations, and deeper debate to reach this target.
- Only cite references from the provided list below

OUTPUT THE LITERATURE REVIEW SECTION DIRECTLY. No preamble, no "Here is the literature review:", no top-level section header. Start with the first thematic subheading (e.g., "## 2.1 ...").

References available:
${refListForPrompt}
${additionalContext}`;

    let literatureReviewContent = await generateSectionWithRetry('Literature Review', engine, systemPrompt, literatureReviewPrompt, { maxTokens: 32000 });
    literatureReviewContent = await expandSectionToTarget('Literature Review', 'literature_review', literatureReviewContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 4: METHODOLOGY (1000-1500 words)
    // ──────────────────────────────────────────────────────────────────────────
    const methodPrompt = `OUTPUT THE METHODOLOGY SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first subheading (e.g., "## 3.1 ...").

Write a Scopus-quality METHODOLOGY section for a qualitative literature-based research article. This section must be between 1500 and 2500 words. The prose must explain the methodological choices with thorough justification, demonstrating awareness of philosophical underpinnings and research design alternatives.

Title: "${finalTitle}"
Research Method: ${methodLabel}
Keywords: ${keywords.join(', ')}
Number of references analysed: ${validSelectedRefs.length}
Publication year range: ${minYear}-${maxYear}

NARRATIVE FLOW — the methodology must cover the following areas with naturally flowing prose. Use numbered subheadings (3.1, 3.2, etc.):

**Research Philosophy and Paradigm:**
State the philosophical underpinning (interpretivism, constructivism, pragmatism, or critical theory) and justify this choice with reference to the nature of ${kw1} and the research questions. Explain the ontological and epistemological assumptions. Reference relevant methodological literature (e.g., Creswell, Denzin & Lincoln, Lincoln & Guba).

**Research Design and Approach:**
Explain the chosen ${methodLabel} approach in scholarly detail. Justify its suitability for answering the stated research questions. Discuss the overall research architecture. Reference at least 2 methodological sources.

**Search Strategy and Systematic Data Collection:**
Describe the systematic search process with specificity:
- Databases consulted (Scopus, Web of Science, Google Scholar, PubMed, PsycINFO, ERIC, etc.)
- Actual Boolean search strings used — provide realistic examples
- Inclusion criteria: publication years ${minYear}-${maxYear}, English language, peer-reviewed status, relevance to keywords, SINTA 1-3/Scopus Q1-Q4 journals
- Exclusion criteria: non-peer-reviewed sources, unrelated topics, duplicate entries, non-English publications
- PRISMA flow described narratively: initial database returns → removal of duplicates → title/abstract screening → full-text eligibility assessment → final included studies (n = ${validSelectedRefs.length})
- IMPORTANT: Include a Markdown representation of the PRISMA flow diagram showing the numbers at each stage. Use a simple text-based flowchart format.

**Data Analysis Framework:**
Describe the analytical approach: thematic analysis procedure (e.g., Braun & Clarke, 2006 six-phase framework), coding process (open coding → axial coding → selective coding), theme development and validation, synthesis approach, and software tools or manual procedures employed.

**Trustworthiness, Rigour, and Validity:**
Address established criteria for qualitative research trustworthiness (Lincoln & Guba, 1985): credibility, transferability, dependability, confirmability. Address potential biases.

**Ethical Considerations:**
Discuss ethical aspects relevant to secondary research: proper attribution, avoidance of plagiarism, responsible synthesis, intellectual honesty.

CRITICAL RULES:
- Write in formal British English, past tense for procedures already undertaken
- Every methodological claim must be supported by APA bodynote citations (Author, Year)
- Use hedging where appropriate
- Total word count MUST reach at least 1500 words. Writing 1500-2500 words is the target range. EXPAND each sub-section with more detailed justification, additional methodological literature, and thorough explanation to reach this target.
- The prose should read as a coherent justification of methodological choices, not a mechanical checklist

OUTPUT THE METHODOLOGY SECTION DIRECTLY. No preamble, no "Here is the methodology:", no top-level section header. Start with the first subheading (e.g., "## 3.1 ...").

${additionalContext}`;

    let methodContent = await generateSectionWithRetry('Methodology', engine, systemPrompt, methodPrompt, { maxTokens: 32000 });
    methodContent = await expandSectionToTarget('Methodology', 'method', methodContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 5: RESULTS (2000-3000 words)
    // Study characteristics, PRISMA flow, thematic findings, tables
    // ──────────────────────────────────────────────────────────────────────────
    const resultsPrompt = `OUTPUT THE RESULTS SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first subheading (e.g., "## 4.1 ...").

Write a Scopus-quality RESULTS section for a systematic literature review. This section must be between 3000 and 5000 words. The results section presents the FINDINGS of the analysis — data, tables, themes, and patterns. Do NOT include scholarly debate, theoretical synthesis, or implications (those belong in the Discussion section). Use numbered subheadings (4.1, 4.2, etc.).

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}

Research Questions (from the introduction):
RQ1: What are the current theoretical and empirical developments in ${kw1}?
RQ2: What research gaps exist in the current literature on ${keywords.join(', ')}?
RQ3: How do different theoretical frameworks contribute to understanding ${kw1}?
RQ4: What are the implications for future research and practice in ${kw2}?

STRUCTURE — this section MUST contain the following components:

**4.1 Study Selection and PRISMA Flow (approximately 500 words):**
Present the PRISMA flow as a Markdown text-based diagram showing the numbers at each stage:
- Identification: records identified through database searching (e.g., 1,247)
- Screening: records after duplicates removed, records screened by title/abstract
- Eligibility: full-text articles assessed for eligibility
- Included: final number of studies included in the review (n = ${validSelectedRefs.length})
Then provide a brief narrative description of the screening process and reasons for exclusion.

**4.2 Study Characteristics (approximately 700 words):**
Present **Table 1** (a Markdown table) with the following columns: Author(s) | Year | Country | Research Design | Sample/Context | Key Findings. Populate this table with data from the provided references. Reference the table naturally: "The characteristics of the included studies are summarised in Table 1." Then discuss the distribution of studies by year, geography, and methodology.

**4.3 Thematic Analysis Overview (approximately 600 words):**
Present a thorough overview of the thematic findings. Describe how many themes emerged and how each maps to the research questions. Present **Table 2** (a Markdown table) showing: Theme | Sub-themes | Frequency of Appearance | Key Supporting References | Theoretical Alignment. Reference the table naturally: "The thematic structure derived from the systematic analysis is presented in Table 2."

**4.4 Results for RQ1: Theoretical and Empirical Developments (approximately 900 words):**
Present findings related to RQ1. Trace the historical evolution of theories from foundational works to contemporary developments. Present **Table 3** (a Markdown table) showing: Trend | Evidence | Supporting References | Year Range | Geographical Scope. Discuss empirical developments with specific qualitative findings from cited studies. NO scholarly debate — present the findings objectively.

**4.5 Results for RQ2: Research Gaps (approximately 600 words):**
Present findings related to RQ2. Present **Table 4** (a Markdown table) showing: Gap Area | Identified By | Year | Status (Open/Partially Addressed/Closed) | Significance Level | Proposed Approach. Categorise gaps: theoretical, methodological, contextual, temporal, geographical, population. NO scholarly debate — present the gaps objectively.

**4.6 Results for RQ3: Theoretical Framework Comparison (approximately 800 words):**
Present findings related to RQ3. Present **Table 5** (a Markdown table) comparing: Theory | Key Proponents | Core Propositions | Strengths | Limitations | Empirical Support | Compatibility with Other Theories. For each theory, provide factual analysis. NO scholarly debate — present comparisons objectively.

**4.7 Results for RQ4: Implications Overview (approximately 400 words):**
Present **Table 6** (a Markdown table): Implication Type | Description | Priority (High/Medium/Low) | Relevant Literature | Timeline. This should be a factual summary table.

CRITICAL RULES:
1. This is the RESULTS section ONLY — present findings, data, and tables. Do NOT include scholarly debate, theoretical argument, or implications discussion.
2. Create actual Markdown tables (using | and -) for Table 1 through Table 6
3. Reference every table by name at the END of the paragraph BEFORE it appears
4. Use APA bodynote (Author, Year) for EVERY claim — no unsupported assertions
5. Only cite references from the provided list below
6. Use hedging language: "suggests", "may indicate", "appears to"
7. Write in formal British English exclusively
8. Total word count MUST reach at least 3000 words. Writing 3000-5000 words is the target range. EXPAND each sub-section with more detailed findings, richer table content, and deeper analysis.

OUTPUT THE RESULTS SECTION DIRECTLY. No preamble, no "Here are the results:", no top-level section header. Start with the first subheading (e.g., "## 4.1 ...").

References available:
${refListForPrompt}
${additionalContext}`;

    let resultsContent = await generateSectionWithRetry('Results', engine, systemPrompt, resultsPrompt, { maxTokens: 32000 });
    resultsContent = await expandSectionToTarget('Results', 'results', resultsContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 6: DISCUSSION (1500-2000 words)
    // Scholarly debate, theoretical synthesis, implications
    // ──────────────────────────────────────────────────────────────────────────
    const discussionPrompt = `OUTPUT THE DISCUSSION SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first subheading (e.g., "## 5.1 ...").

Write a Scopus-quality DISCUSSION section for a systematic literature review. This section must be between 2500 and 4000 words. The discussion interprets the results, engages in scholarly debate, synthesises theoretical implications, and connects findings to the broader literature. This is NOT a results summary — it is where you interpret, debate, and synthesise. Use numbered subheadings (5.1, 5.2, etc.).

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}

STRUCTURE — this section MUST contain the following components:

**5.1 Interpretation of Key Findings (approximately 600 words):**
Interpret the most significant findings from the results. Discuss what the findings mean in the context of the broader literature. Connect findings across different research questions. Engage with cited sources through scholarly debate — where findings agree or disagree with prior work, explain why. At least 3 debate exchanges where references ACTIVELY talk to each other.

**5.2 Theoretical Synthesis and Scholarly Debate (approximately 900 words):**
This is the intellectual heart of the discussion. Extract the KEY THEORETICAL CONCEPTS that emerged and engage in deep scholarly debate:
- How do different theoretical frameworks explain the observed patterns?
- Where do theories complement, contradict, or extend each other?
- What paradigm shifts does the evidence suggest?
- Provide at least 5 debate exchanges where references ACTIVELY debate each other. For example: "Smith (2021) argues that ${kw1} is primarily driven by institutional factors; however, Johnson (2022) presents compelling evidence that individual agency is the dominant determinant, suggesting a paradigm shift. This tension is further complicated by Williams (2023), who proposes a dialectical model wherein institutional structures and individual agency co-constitute outcomes."

**5.3 Implications for Theory and Practice (approximately 600 words):**
- Theoretical implications: What new insights does the analysis generate? How does it refine, extend, or challenge existing frameworks? Be specific about which theoretical positions are strengthened or weakened.
- Practical implications: Specific, actionable recommendations for practitioners, policymakers, and educators grounded in the evidence.
- Connect implications directly to the findings and the scholarly debate above.

**5.4 Limitations (approximately 300 words):**
Honestly acknowledge the limitations of this systematic review — methodological constraints, scope boundaries, potential publication bias, language bias, and the limitations of secondary analysis.

**5.5 Future Research Directions (approximately 400 words):**
Propose 4-5 specific, concrete future research directions that emerge from the findings and the identified gaps. Each direction should be specific enough that another researcher could use it as a starting point. Ground these directions in the evidence discussed.

CRITICAL RULES:
1. This is the DISCUSSION section — interpret, debate, and synthesise. Do NOT present new results or tables.
2. EVERY sub-section must feature scholarly debate where references ACTIVELY talk to each other
3. Use APA bodynote (Author, Year) for EVERY claim
4. Only cite references from the provided list below
5. Use hedging language: "suggests", "may indicate", "appears to", "tends to"
6. Write in formal British English exclusively
7. The discussion must feel ALIVE — as if referenced scholars are engaged in a vibrant academic conversation
8. Total word count MUST reach at least 2500 words. Writing 2500-4000 words is the target range. EXPAND each sub-section with more detailed scholarly debate, deeper theoretical analysis, and richer implications.

OUTPUT THE DISCUSSION SECTION DIRECTLY. No preamble, no "Here is the discussion:", no top-level section header. Start with the first subheading (e.g., "## 5.1 ...").

References available:
${refListForPrompt}
${additionalContext}`;

    let discussionContent = await generateSectionWithRetry('Discussion', engine, systemPrompt, discussionPrompt, { maxTokens: 32000 });
    discussionContent = await expandSectionToTarget('Discussion', 'discussion', discussionContent, engine, systemPrompt);
    await interSectionDelay();

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 7: CONCLUSION (400-600 words, no new citations)
    // ──────────────────────────────────────────────────────────────────────────
    const conclusionPrompt = `OUTPUT THE CONCLUSION SECTION DIRECTLY. Do not include any preamble, meta-commentary, or section headers. Start immediately with the first paragraph.

Write a Scopus-quality CONCLUSION section for a research article. This section must be between 800 and 1200 words. The conclusion must synthesise the article's key contributions without introducing any new information, data, or citations. The prose must flow naturally without subheadings.

Title: "${finalTitle}"
Keywords: ${keywords.join(', ')}

NARRATIVE FLOW — the conclusion must move through the following stages in naturally flowing prose (2-4 paragraphs total, depending on the argument's needs):

**Synthesis of Key Findings:**
Begin by summarising the most significant findings from the analysis. Reference each research question by number and provide a substantive — not vague — summary of what was discovered. This is not a list but a synthesised narrative: "The systematic analysis revealed that..." Connect the findings to show how they form a coherent picture. This should be the longest part of the conclusion (approximately 250-350 words).

**Theoretical Contributions:**
Clearly articulate what this article contributes to theory. What new insights does the analysis generate? How does it refine, extend, or challenge existing theoretical frameworks? Be specific about which theoretical positions are strengthened or weakened. State contributions with confidence but without hyperbole (approximately 150-200 words).

**Practical Implications:**
State practical recommendations grounded in the evidence — for practitioners, policymakers, educators, or other relevant stakeholders. Recommendations should be specific and actionable, not generic platitudes (approximately 100-150 words).

**Limitations and Future Research Directions:**
Honestly acknowledge the limitations of this study — methodological constraints, scope boundaries, potential biases. Then propose 4-5 specific, concrete future research directions that emerge from the findings and limitations. Each direction should be specific enough that another researcher could use it as a starting point (approximately 150-200 words).

**Closing Statement:**
End with a single, powerful, memorable paragraph (not just a sentence) that reiterates the significance of this research and its potential lasting impact on the field. This should feel authoritative, forward-looking, and definitive (approximately 50-100 words).

CRITICAL RULES:
- Do NOT introduce new citations — only discuss findings and sources already referenced in the article
- Do NOT use subheadings — paragraphs must flow naturally through transitional phrases
- Use hedging language even in the conclusion: "suggests", "appears to", "may contribute to"
- Write in formal British English exclusively
- Total word count MUST reach at least 800 words. Writing 800-1200 words is the target range. EXPAND each stage with more detailed synthesis, richer analysis, and deeper discussion to reach this target.
- The closing statement should be the final sentence of the entire article — make it count

OUTPUT THE CONCLUSION SECTION DIRECTLY. No preamble, no "Here is the conclusion:", no section headers. Start with the first paragraph.

${additionalContext}`;

    let conclusionContent = await generateSectionWithRetry('Conclusion', engine, systemPrompt, conclusionPrompt, { maxTokens: 32000 });
    conclusionContent = await expandSectionToTarget('Conclusion', 'conclusion', conclusionContent, engine, systemPrompt);

    // ──────────────────────────────────────────────────────────────────────────
    // SECTION 8: BIBLIOGRAPHY (100% REAL DATA — formatted programmatically, NO AI)
    // ──────────────────────────────────────────────────────────────────────────
    // Convert selected references to RealReference format for bibliography formatting
    const realRefsForBib = validSelectedRefs.slice(0, 50).map((r: Reference, i: number) => ({
      id: r.id || `ref_${i}`,
      title: r.title,
      authors: r.authors,
      year: String(r.year),
      abstract: r.abstract || '',
      doi: r.doi || '',
      journal: r.journal || '',
      volume: r.volume || '',
      issue: r.issue || '',
      pages: r.pages || '',
      source: r.source || 'Unknown',
      pdfUrl: r.pdfUrl || '',
      relevanceScore: r.relevanceScore || 0,
      refType: r.refType || 'Journal Article',
      isSelected: true,
      keywords: r.keywords || [],
    }));

    // Format bibliography from REAL data — NO AI hallucination
    const bibliographyContent = formatBibliography(realRefsForBib);

    // ──────────────────────────────────────────────────────────────────────────
    // VALIDATE SECTION CONTENT — fail only if any section exhausted all retries
    // ──────────────────────────────────────────────────────────────────────────
    const sectionResults: Record<string, string> = {
      Abstract: abstractContent,
      Introduction: introContent,
      'Literature Review': literatureReviewContent,
      Methodology: methodContent,
      Results: resultsContent,
      Discussion: discussionContent,
      Conclusion: conclusionContent,
    };

    const failedSectionNames = Object.entries(sectionResults)
      .filter(([, content]) => !isSectionValid(content))
      .map(([name]) => name);

    if (failedSectionNames.length > 0) {
      return NextResponse.json(
        { success: false, error: `AI generation failed for ${failedSectionNames.length} section(s) (${failedSectionNames.join(', ')}). All retries exhausted. Please try again in a moment.` },
        { status: 503 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ASSEMBLE ARTICLE
    // ──────────────────────────────────────────────────────────────────────────
    const contentSections = [
      { type: 'abstract' as const, content: abstractContent, wordCount: countWords(abstractContent) },
      { type: 'introduction' as const, content: introContent, wordCount: countWords(introContent) },
      { type: 'literature_review' as const, content: literatureReviewContent, wordCount: countWords(literatureReviewContent) },
      { type: 'method' as const, content: methodContent, wordCount: countWords(methodContent) },
      { type: 'results' as const, content: resultsContent, wordCount: countWords(resultsContent) },
      { type: 'discussion' as const, content: discussionContent, wordCount: countWords(discussionContent) },
      { type: 'conclusion' as const, content: conclusionContent, wordCount: countWords(conclusionContent) },
      { type: 'bibliography' as const, content: bibliographyContent, wordCount: countWords(bibliographyContent) },
    ];

    // Total word count EXCLUDING bibliography
    const totalWordCount = contentSections
      .filter((s) => s.type !== 'bibliography')
      .reduce((sum, s) => sum + s.wordCount, 0);

    const article = {
      title: finalTitle,
      keywords,
      sections: contentSections,
      references: validSelectedRefs,
      totalWordCount,
      isPolished: false,
    };

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error('Article generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate article. Please try again.' },
      { status: 500 },
    );
  }
}