import { generateWithEngine, DEFAULT_ENGINE } from '@/lib/ai-engine';
import { AI_ENGINES, type AIEngineId } from '@/lib/ai-engine-config';

export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolishSection {
  type: string;
  content: string;
  wordCount: number;
}

interface PolishOptions {
  structural?: boolean;
  tone?: boolean;
  citations?: boolean;
  coherence?: boolean;
  clarity?: boolean;
  vocabulary?: boolean;
  grammar?: boolean;
  formatting?: boolean;
}

interface SectionNames {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_NAMES: SectionNames = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  method: 'Methodology',
  results: 'Results & Discussion',
  conclusion: 'Conclusion',
  bibliography: 'Bibliography',
};

/** Max tokens per section — based on expected word counts (~1.3 tokens per word) */
const SECTION_MAX_TOKENS: Record<string, number> = {
  abstract: 16000,
  introduction: 32000,
  method: 32000,
  results: 32000,
  conclusion: 16000,
};

const POLISH_TEMPERATURE = 0.85;
const INTER_SECTION_DELAY_MS = 5000; // 5 seconds between sections to avoid rate limits

// ---------------------------------------------------------------------------
// Shared system prompt with BEFORE/AFTER examples and transformation rules
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are Dr. Eleanor Whitfield, a senior academic editor with 30 years of experience editing manuscripts for Nature, Science, The Lancet, and top-tier field-specific journals. You have an impeccable command of British English academic prose and are known for transforming competent drafts into publication-ready scholarship.

## YOUR APPROACH: REWRITE, NOT PROOFREAD

You MUST produce SUBSTANTIALLY DIFFERENT text. At least 30% of sentences must be RESTRUCTURED — not merely tweaked with a synonym swap. This is a comprehensive academic REWRITE that transforms the text while preserving all factual meaning and citations.

## BEFORE/AFTER EXAMPLES OF YOUR EDITING

### Example 1 — Vague to Specific
BEFORE: "This study looks at the impact of social media on students."
AFTER: "This study examines the multifaceted impact of social media platforms on student engagement, academic performance, and psychosocial well-being within higher education contexts."

### Example 2 — Weak Citing to Rich Literature Synthesis
BEFORE: "Many researchers have found that AI is important."
AFTER: "A growing body of literature underscores the transformative role of artificial intelligence across diverse sectors (Chen, 2023; Kumar et al., 2022), with recent empirical evidence suggesting its significance extends beyond operational efficiency to encompass strategic decision-making and competitive advantage (Williams & Johnson, 2024)."

### Example 3 — Bare Results to Analytical Reporting
BEFORE: "The results show that there is a significant difference."
AFTER: "The analysis reveals a statistically significant difference (p < 0.05) between the experimental and control groups, thereby supporting the hypothesis that the intervention yielded measurable improvements in participant outcomes."

### Example 4 — Simple Transition to Sophisticated Linkage
BEFORE: "Also, the study had some limitations."
AFTER: "Whilst these findings offer valuable insights, it is important to acknowledge several methodological limitations that may constrain the generalisability of the results."

### Example 5 — Generic Conclusion to Impactful Close
BEFORE: "In conclusion, more research is needed on this topic."
AFTER: "In conclusion, this study contributes to the growing discourse on [topic] by demonstrating [key finding]. Future research should employ longitudinal designs to examine the sustainability of these effects and explore the moderating role of contextual factors across diverse populations."

## FORBIDDEN PATTERNS (things to REMOVE or REWRITE)
- "This study looks at" → use "examines", "investigates", "explores", "scrutinises"
- "A lot of" → use "a substantial body of", "a considerable number of", "numerous"
- "Good" / "bad" → use "favourable" / "unfavourable", "robust" / "limited"
- "Important" → use "significant", "noteworthy", "consequential", "pivotal"
- "Shows that" → use "demonstrates", "reveals", "indicates", "suggests"
- "Used" (as main verb) → use "employed", "utilised", "applied", "implemented"
- "Need" → use "require", "necessitate", "warrant", "call for"
- "Help" → use "facilitate", "contribute to", "enable", "support"
- "Make" → use "constitute", "establish", "yield", "produce"
- "Find" (as in discover) → use "identify", "ascertain", "establish", "determine"
- "Get" → use "obtain", "derive", "acquire", "achieve"
- Sentence starters: "Also," "And," "But," "So," → use "Furthermore,", "Moreover,", "However,", "Consequently,"
- Passive voice without clear agent where active is stronger
- Run-on sentences without proper subordination
- Citations in parenthetical-only form without integrating them into the narrative

## PREFERRED PATTERNS (things to ADD)
- Multi-source synthesis: "Several studies (Author, Year; Author, Year) have demonstrated..."
- Hedging language: "suggests", "indicates", "may", "appears to", "it is plausible that"
- Transition phrases: "whilst", "moreover", "furthermore", "nevertheless", "in contrast", "consequently", "notably", "significantly"
- Nominalisation where appropriate: "the development of" instead of "developing"
- Subordinate clauses for complexity: "Although prior research has established..., the present study extends this by..."
- Precise statistical language: "statistically significant (p < 0.05)", "effect size of d = 0.72"
- Thematic topic sentences at the start of each paragraph
- Source dialogue: "Whilst Author (Year) argues X, Author (Year) contends Y, suggesting..."
- Concrete examples after general claims
- British English spelling throughout: organisation, analyse, programme, behaviour, colour, centre, favour, labour, modelling, fulfil

## CRITICAL RULES
1. You MUST restructure at least 30% of sentences — merge, split, reorder, or completely rephrase them
2. Keep ALL original citations in APA 7 format (Author, Year)
3. Do NOT add new references that were not in the original text
4. Maintain the same approximate word count (±15%) to preserve section balance
5. Use British English spelling exclusively
6. Return ONLY the polished section text — no preamble, no commentary, no markdown code fences
7. Preserve any markdown formatting present in the original (bold, italic, headings, lists)
8. The output must read as a REWRITTEN version, not a lightly edited copy`;

// ---------------------------------------------------------------------------
// Section-specific polish prompts
// ---------------------------------------------------------------------------

function getSectionPrompt(
  sectionType: string,
  sectionContent: string,
  title: string,
  keywords: string[],
  options: PolishOptions,
): string {
  const sectionName = SECTION_NAMES[sectionType] || sectionType;

  // Build the enabled options list
  const enabledDims: string[] = [];
  if (options.grammar) enabledDims.push('grammar and syntax correction');
  if (options.vocabulary) enabledDims.push('vocabulary enrichment with precise academic terminology');
  if (options.tone) enabledDims.push('elevation to formal British English academic tone');
  if (options.clarity) enabledDims.push('clarity improvement (simplifying without losing rigour)');
  if (options.coherence) enabledDims.push('coherence enhancement (transitions and logical flow)');
  if (options.citations) enabledDims.push('citation format consistency and integration into narrative');
  if (options.structural) enabledDims.push('structural improvement (paragraph organisation, topic sentences)');
  if (options.formatting) enabledDims.push('formatting consistency');

  const dimsText = enabledDims.length > 0
    ? enabledDims.join(', ')
    : 'all dimensions of academic writing quality';

  // Common wrapper
  const articleContext = `ARTICLE TITLE: "${title}"
KEYWORDS: ${keywords.join(', ') || 'N/A'}
POLISH DIMENSIONS ENABLED: ${dimsText}`;

  switch (sectionType) {
    case 'abstract':
      return `${articleContext}

## SECTION: Abstract

## SECTION-SPECIFIC INSTRUCTIONS:
1. **Structure verification**: Ensure the abstract follows the Background → Objective → Method → Results → Conclusion flow. If any element is missing or misplaced, reorganise accordingly.
2. **Quantitative specificity**: Add or strengthen specific quantitative details (sample sizes, key statistics, effect sizes, p-values) wherever the original text is vague. For example, change "a significant improvement" to "a statistically significant improvement (p < 0.01, d = 0.68)".
3. **Citation weaving**: Ensure at least 3 citations are naturally woven into the narrative, not just listed parenthetically. Each citation should contribute to the argument (e.g., "Building on prior work by Author (Year), this study...").
4. **Word count**: The abstract should be at least 250 words. If it is shorter, expand by adding methodological detail, contextual significance, and stronger implications.
5. **The "so what?" factor**: Strengthen the implications sentence(s) at the end. The reader should finish the abstract understanding WHY this research matters. Transform vague impact claims into specific, concrete contributions.
6. **Rewrite requirement**: RESTRUCTURE at least 40% of sentences. Merge short choppy sentences. Expand thin claims. Split overly long ones.

## ABSTRACT TO POLISH:

${sectionContent}`;

    case 'introduction':
      return `${articleContext}

## SECTION: Introduction

## SECTION-SPECIFIC INSTRUCTIONS:
1. **Funnel structure verification**: Ensure the introduction moves from broad context (first 1-2 paragraphs establishing the field and its importance) → narrow focus (identifying the specific problem/gap) → research questions/objectives (final paragraph). If the structure is flat, reorganise paragraphs to create this funnel.
2. **Citation synthesis improvement**: Citations must be grouped BY THEME, not listed one-by-one. Transform "Author1 (Year) found X. Author2 (Year) found Y." into "A growing body of literature demonstrates that X is influenced by several factors, including Y (Author1, Year; Author2, Year) and Z (Author3 et al., Year)." Show debates and contradictions between sources.
3. **Hedging language**: Add appropriate hedging where claims are not yet proven: "may suggest", "appears to", "it is plausible that", "tends to", "is associated with". Remove inappropriate certainty where evidence is limited.
4. **Paragraph transitions**: Ensure EVERY paragraph opens with a transition that connects it to the preceding paragraph. Use phrases like "Whilst the aforementioned studies established...", "Building upon this foundation...", "In contrast to these findings...", "Furthermore, recent scholarship has...". Remove any paragraph that starts abruptly without connecting to the prior discourse.
5. **Research questions clarity**: The final paragraph must end with clearly stated Research Questions (RQs). If RQs are missing, vague, or buried mid-paragraph, extract and clearly format them. Use "This study is guided by the following research questions:" or similar.
6. **Transition enrichment**: Add "whilst", "moreover", "furthermore", "nevertheless", "notably" and other academic connectors where the original uses plain "also", "and", "but", "so".
7. **Rewrite requirement**: RESTRUCTURE at least 35% of sentences. The introduction must flow as a compelling academic narrative, not read like an annotated bibliography.

## INTRODUCTION TO POLISH:

${sectionContent}`;

    case 'literature_review':
      return `${articleContext}

## SECTION: Literature Review

## SECTION-SPECIFIC INSTRUCTIONS:
1. **Thematic organisation**: The literature review MUST be organised by THEMES or CONCEPTUAL FRAMEWORKS, not chronologically. If sources are listed in chronological order (Author1, 2019; Author2, 2020; Author3, 2021), REORGANISE them by theme. Each thematic cluster should discuss multiple sources in dialogue.
2. **Source dialogue quality**: Sources MUST debate, contrast, and build upon each other. Transform laundry-list patterns like "Author1 (Year) said X. Author2 (Year) said Y. Author3 (Year) said Z." into scholarly dialogue: "Whilst Author1 (Year) emphasises X, Author2 (Year) contends Y, and more recently Author3 et al. (Year) have demonstrated that Z — suggesting an evolving understanding of the phenomenon."
3. **Gap identification**: At the END of each thematic section, explicitly identify what is missing or underexplored. Use language like "Despite these advances, a notable gap remains...", "However, limited attention has been paid to...", "The existing literature has predominantly focused on X, leaving Y largely unexamined."
4. **Remove laundry-list citations**: Any pattern of "(Author, Year; Author, Year; Author, Year)" with 4+ sources listed without narrative integration must be REWRITTEN. Group by sub-theme and add brief descriptions of each source's contribution.
5. **Theoretical synthesis**: Strengthen the theoretical framework. If the review lacks theoretical grounding, add sentences connecting findings to relevant theories. If theories are mentioned, ensure they are properly explained and their relevance justified.
6. **Paragraph-level coherence**: Each paragraph should have a clear topic sentence, supporting evidence from multiple sources, and a concluding sentence that transitions to the next theme.
7. **Rewrite requirement**: RESTRUCTURE at least 40% of sentences. The literature review must read as a coherent scholarly synthesis, not a catalogue of summaries.

## LITERATURE REVIEW TO POLISH:

${sectionContent}`;

    case 'method':
      return `${articleContext}

## SECTION: Methodology

## SECTION-SPECIFIC INSTRUCTIONS:
1. **Sub-section verification**: Ensure ALL of the following sub-sections are present. If any are missing or merged without clear separation, ADD appropriate sub-headings and content:
   - Research Philosophy (e.g., interpretivism, positivism, pragmatism) with justification
   - Research Design (e.g., case study, survey, experimental, mixed methods) with rationale
   - Search Strategy / Data Collection (where, how, inclusion/exclusion criteria)
   - Data Analysis approach (step-by-step, not just name of technique)
   - Trustworthiness / Rigour (credibility, transferability, dependability, confirmability — or equivalent for quantitative)
   - Ethical Considerations (informed consent, anonymity, institutional approval)
2. **Methodological detail and justification**: For EVERY methodological choice, add or strengthen the JUSTIFICATION. Why this method? Why not alternatives? Use methodological citations to support choices (e.g., "Following the approach advocated by Creswell (2014), a mixed-methods design was employed..."). Add citations like Braun & Clarke (2006) for thematic analysis, Creswell (2014) for research design, Yin (2018) for case studies, etc., where the methodology aligns with established frameworks.
3. **Past tense for procedures**: ALL procedures that were carried out MUST be in past tense: "Data were collected", "Participants were recruited", "Analysis was conducted". If any procedure is in present tense, convert it.
4. **Precision**: Replace vague quantifiers with specific details. Change "several" to exact numbers. Change "various journals" to specific database names if inferable. Change "a period of time" to actual durations.
5. **Voice and formality**: Ensure consistent use of passive voice for procedures ("Semi-structured interviews were conducted" not "We conducted semi-structured interviews") unless the journal style actively prefers first person.
6. **Rewrite requirement**: RESTRUCTURE at least 30% of sentences. Add missing sub-sections and justifications.

## METHODOLOGY TO POLISH:

${sectionContent}`;

    case 'results':
      return `${articleContext}

## SECTION: Results

## SECTION-SPECIFIC INSTRUCTIONS:
1. **RQ-addressed structure**: Verify that EACH Research Question is explicitly addressed with clear presentation of relevant findings. If any RQ is not addressed, add a section.
2. **Data presentation**: Ensure all quantitative data is presented with precision — include specific statistics (means, standard deviations, effect sizes, p-values, confidence intervals) rather than vague descriptions.
3. **Table/figure references**: If the text mentions or implies data that should be in a table or figure, add natural references like "As shown in Table 1," "These patterns are further illustrated in Figure 2,".
4. **Analytical depth**: Move beyond description ("X was higher than Y") to interpretation ("The higher levels of X may reflect the influence of..."). Every major finding should be followed by a "what this means" statement.
5. **Thematic organisation**: Group findings by theme or research question, not by source. Use clear sub-headings where appropriate.
6. **Precise language**: Replace vague quantifiers with specific details. Change "several" to exact numbers where inferable.
7. **Rewrite requirement**: RESTRUCTURE at least 35% of sentences. The results section must demonstrate clarity and analytical rigour.

## RESULTS TO POLISH:

${sectionContent}`;

    case 'discussion':
      return `${articleContext}

## SECTION: Discussion

## SECTION-SPECIFIC INSTRUCTIONS:
1. **Source dialogue quality**: For each finding, integrate the discussion with existing literature. Use patterns like: "This finding aligns with Author (Year), who similarly found... However, in contrast to Author (Year), the present study suggests..." Sources must ENGAGE with the findings, not merely be cited.
2. **Theoretical implications**: Explicitly connect findings to theoretical frameworks. Use language like "These findings lend support to the theoretical proposition that...", "From the perspective of [Theory], the results suggest..."
3. **Hedging language enrichment**: Add appropriate hedging around interpretive claims: "may indicate", "could be attributed to", "it is conceivable that", "one possible explanation is that". Remove unjustified certainty where the evidence is correlational or suggestive.
4. **Practical implications**: Include a clear discussion of practical implications for practitioners, policymakers, or the field at large.
5. **Honest and specific limitations**: Generic limitations must be made specific. Each limitation should include its IMPLICATION (how it affects interpretation). Add at least 2-3 specific limitations.
6. **Concrete future research directions**: Vague suggestions like "more research is needed" must be replaced with SPECIFIC proposals.
7. **Rewrite requirement**: RESTRUCTURE at least 35% of sentences. The discussion must demonstrate analytical depth and scholarly engagement.

## DISCUSSION TO POLISH:

${sectionContent}`;

    case 'conclusion':
      return `${articleContext}

## SECTION: Conclusion

## SECTION-SPECIFIC INSTRUCTIONS:
1. **NO new citations**: The conclusion must NOT introduce any new references. It should only reference sources already discussed in the body of the paper. Remove any citations that appear for the first time in the conclusion.
2. **Contribution statement strengthening**: The contribution statement must be specific and concrete. Transform "This study contributes to the literature" into "This study makes three principal contributions to the literature on [topic]: first, it demonstrates [specific finding]; second, it provides empirical evidence for [specific claim]; third, it offers a framework for [specific application]."
3. **Honest and specific limitations**: Generic limitations like "the sample was small" must be made specific: "the sample comprised 45 participants from a single institution, which may limit the generalisability of findings to broader populations." Add at least 3 specific limitations if fewer exist. Each limitation should include its IMPLICATION (how it affects interpretation).
4. **Concrete future research directions**: Vague suggestions like "more research is needed" must be replaced with SPECIFIC proposals: "Future research should employ longitudinal designs to examine the sustainability of these effects over time," or "Subsequent studies might explore the moderating role of cultural context by conducting cross-national comparative analyses." Provide at least 2-3 concrete, actionable research directions.
5. **Strong closing statement**: The final 1-2 sentences should leave the reader with a clear sense of the study's significance. Avoid ending with a generic restatement. Instead, close with the broader implications or a compelling thought.
6. **Rewrite requirement**: RESTRUCTURE at least 35% of sentences. The conclusion must be impactful, honest, and forward-looking.

## CONCLUSION TO POLISH:

${sectionContent}`;

    default:
      // Fallback for unknown section types — still apply strong polish
      return `${articleContext}

## SECTION: ${sectionName}

## INSTRUCTIONS:
Apply comprehensive academic polish across all enabled dimensions: ${dimsText}.
RESTRUCTURE at least 30% of sentences. The output must be substantively different from the input while preserving all meaning and citations.

## ${sectionName.toUpperCase()} TO POLISH:

${sectionContent}`;
  }
}

// ---------------------------------------------------------------------------
// Word-level difference calculation
// ---------------------------------------------------------------------------

function calculateChangePercentage(original: string, polished: string): number {
  const normalize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 0);

  const originalWords = normalize(original);
  const polishedWords = normalize(polished);

  if (originalWords.length === 0) return 0;

  // Use a set-based approach: count words in polished that are NOT in the same position in original
  let changedWords = 0;

  // For each word in polished, check if it differs from the corresponding word in original
  const maxLen = Math.max(originalWords.length, polishedWords.length);
  for (let i = 0; i < maxLen; i++) {
    const oWord = i < originalWords.length ? originalWords[i] : null;
    const pWord = i < polishedWords.length ? polishedWords[i] : null;
    if (oWord !== pWord) {
      changedWords++;
    }
  }

  return Math.round((changedWords / maxLen) * 100);
}

// ---------------------------------------------------------------------------
// Stronger retry prompt for when the first attempt is too similar
// ---------------------------------------------------------------------------

const RETRY_SYSTEM_PROMPT = `You are Dr. Eleanor Whitfield, a ruthless academic rewriter. Your job is to take academic text and REWRITE it so aggressively that the original and output look like they were written by two different people who read the same sources.

CRITICAL: Your previous attempt was REJECTED because it was too similar to the original. You changed too few words.

RULES FOR THIS ATTEMPT:
1. RESTRUCTURE every single sentence. Change sentence order, merge short sentences, split long ones.
2. Replace ALL vague words with precise academic alternatives.
3. Add sophisticated transitions between every paragraph.
4. Rewrite every topic sentence to be more specific and compelling.
5. Integrate all parenthetical citations into the narrative flow.
6. Change the sentence structure: if the original is SVO, make it passive or start with an adverbial clause. If passive, consider making it active with a different subject.
7. Use completely different phrasing while keeping the same meaning.

DO NOT be conservative. Be BOLD. The goal is a REWRITE, not a proofread.

Return ONLY the rewritten text. No commentary. No code fences.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Consider a section "substantively changed" if at least 5% of words differ */
function isSubstantivelyChanged(changePct: number): boolean {
  return changePct >= 5;
}

/**
 * Generate a brief human-readable summary of what likely changed in a section.
 * Uses simple heuristics by comparing original and polished text.
 */
function generateImprovementSummary(
  sectionType: string,
  changePct: number,
  original: string,
  polished: string,
): string {
  const changes: string[] = [];

  if (changePct >= 30) {
    changes.push('extensive rewrite');
  } else if (changePct >= 15) {
    changes.push('significant restructuring');
  } else if (changePct >= 5) {
    changes.push('moderate improvements');
  } else {
    changes.push('minor refinements');
  }

  // Check for specific improvements via heuristic keyword analysis
  const origLower = original.toLowerCase();
  const polishedLower = polished.toLowerCase();

  // Transition words added
  const transitions = [
    'furthermore', 'moreover', 'nevertheless', 'whilst', 'consequently',
    'notably', 'significantly', 'in contrast', 'in addition', 'building upon',
  ];
  const newTransitions = transitions.filter(
    t => polishedLower.includes(t) && !origLower.includes(t),
  );
  if (newTransitions.length > 0) {
    changes.push(`${newTransitions.length} new transition(s) added`);
  }

  // Hedging language added
  const hedges = ['may', 'might', 'could', 'suggests', 'appears to', 'it is plausible', 'tends to'];
  const newHedges = hedges.filter(
    h => polishedLower.includes(h) && !origLower.includes(h),
  );
  if (newHedges.length > 0) {
    changes.push('hedging language enriched');
  }

  // Word count change
  const origWords = original.split(/\s+/).filter(w => w.length > 0).length;
  const polishedWords = polished.split(/\s+/).filter(w => w.length > 0).length;
  const wordDiff = polishedWords - origWords;
  if (Math.abs(wordDiff) > 20) {
    changes.push(
      wordDiff > 0
        ? `expanded by ${wordDiff} words`
        : `condensed by ${Math.abs(wordDiff)} words`,
    );
  }

  // Vocabulary richness proxy: unique words ratio
  const origUnique = new Set(origLower.split(/\s+/)).size;
  const polishedUnique = new Set(polishedLower.split(/\s+/)).size;
  if (polishedUnique > origUnique * 1.05) {
    changes.push('vocabulary diversity improved');
  }

  return changes.join(', ');
}

// ---------------------------------------------------------------------------
// Reviewer context builder
// ---------------------------------------------------------------------------

function buildReviewerContext(reviewerNotes: any): string {
  if (!reviewerNotes || !reviewerNotes.reviewers) return '';
  let ctx = '\n\n## CRITICAL PEER REVIEWER FEEDBACK (must address ALL of these)\n\n';
  ctx += `**Overall Recommendation: ${reviewerNotes.overallRecommendation}** (Score: ${reviewerNotes.overallScore}/10)\n\n`;
  if (reviewerNotes.priorityActions?.length > 0) {
    ctx += '**PRIORITY ACTIONS:**\n';
    reviewerNotes.priorityActions.forEach((a: string, i: number) => { ctx += `${i + 1}. ${a}\n`; });
    ctx += '\n';
  }
  reviewerNotes.reviewers.forEach((r: any) => {
    ctx += `### ${r.name} (${r.role}) — ${r.recommendation}\n`;
    ctx += `Assessment: ${r.overallAssessment}\n`;
    if (r.majorIssues?.length > 0) {
      ctx += 'Major issues to fix:\n';
      r.majorIssues.forEach((issue: string, i: number) => { ctx += `  ${i + 1}. ${issue}\n`; });
    }
    if (r.minorIssues?.length > 0) {
      ctx += 'Minor issues to fix:\n';
      r.minorIssues.forEach((issue: string, i: number) => { ctx += `  ${i + 1}. ${issue}\n`; });
    }
    ctx += '\n';
  });
  return ctx;
}

// ---------------------------------------------------------------------------
// POST: Polish article synchronously
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { article, options, engineId, reviewerNotes } = body;

    if (!article || !article.sections || !article.title) {
      return Response.json(
        { success: false, error: 'Article data is required' },
        { status: 400 },
      );
    }

    const polishOptions: PolishOptions = options || {
      structural: true,
      tone: true,
      citations: true,
      coherence: true,
      clarity: true,
      vocabulary: true,
      grammar: true,
      formatting: true,
    };

    // Use zai as default polish engine for reliability, fall back to gemini, then grok
    const polishEngine: AIEngineId = engineId || 'zai';
    const validEngine: AIEngineId = AI_ENGINES.some(e => e.id === polishEngine)
      ? polishEngine
      : DEFAULT_ENGINE;

    console.log(`[polish] Starting polish for "${article.title}" with ${article.sections.length} sections`);

    const keywords: string[] = article.keywords || [];

    // Track metrics
    let totalChangePercentage = 0;
    let sectionsActuallyModified = 0;
    const improvementsLog: string[] = [];
    let sectionsFailed = 0;

    // Polish each section SEQUENTIALLY with delays to avoid rate limit exhaustion
    const sectionsToPolish = article.sections.filter(
      (s: PolishSection) => s.type !== 'bibliography' && s.content?.trim().length > 0,
    );

    const polishedSectionsMap: Record<string, PolishSection> = {};

    for (let i = 0; i < sectionsToPolish.length; i++) {
      const section = sectionsToPolish[i];
      const sectionName = SECTION_NAMES[section.type] || section.type;

      try {
        console.log(`[polish] Processing section ${i + 1}/${sectionsToPolish.length}: ${sectionName} (${section.wordCount || '?'} words)`);

        const userPrompt = getSectionPrompt(
          section.type,
          section.content,
          article.title,
          keywords,
          polishOptions,
        ) + buildReviewerContext(reviewerNotes);

        const maxTokens = SECTION_MAX_TOKENS[section.type] || 16000;

        // First attempt
        let polishedContent = await generateWithEngine(
          validEngine,
          BASE_SYSTEM_PROMPT,
          userPrompt,
          { temperature: POLISH_TEMPERATURE, maxTokens },
        );

        // If content is empty or generation failed, return original
        if (!polishedContent || polishedContent.trim().length === 0) {
          console.warn(`[polish] Section "${sectionName}" returned empty, keeping original`);
          polishedSectionsMap[section.type] = section;
          sectionsFailed++;
          continue;
        }

        // Calculate change percentage
        let changePct = calculateChangePercentage(section.content, polishedContent);

        // If too similar (>95% identical), retry with stronger prompt
        if (changePct < 5) {
          console.log(
            `[polish] Section "${sectionName}" only ${changePct}% changed, retrying with stronger prompt...`,
          );

          // Wait before retry to avoid rate limit
          await new Promise<void>((r) => setTimeout(r, 8000));

          const retryPrompt = `You are rewriting a ${sectionName} section for an academic article titled "${article.title}".

The previous rewrite was REJECTED because it was too similar to the original. You must REWRITE this text more aggressively.

ORIGINAL TEXT (do NOT copy this — REWRITE it):
${section.content}

REWRITE THE ABOVE TEXT. Make it sound like a different author wrote it while keeping the same meaning and all citations. Return ONLY the rewritten text.`;

          const retryResult = await generateWithEngine(
            validEngine,
            RETRY_SYSTEM_PROMPT,
            retryPrompt,
            { temperature: 0.95, maxTokens },
          );

          if (retryResult && retryResult.trim().length > 0) {
            const retryChangePct = calculateChangePercentage(
              section.content,
              retryResult,
            );
            if (retryChangePct > changePct) {
              polishedContent = retryResult;
              changePct = retryChangePct;
              console.log(
                `[polish] Retry for "${sectionName}" achieved ${changePct}% change`,
              );
            }
          }
        }

        // Track metrics
        totalChangePercentage += changePct;

        if (changePct >= 5) {
          sectionsActuallyModified++;
        }

        // Generate a brief summary of what likely changed
        const improvement = generateImprovementSummary(
          section.type,
          changePct,
          section.content,
          polishedContent,
        );
        improvementsLog.push(`${sectionName}: ${improvement}`);

        const wordCount = polishedContent
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;

        polishedSectionsMap[section.type] = {
          type: section.type,
          content: polishedContent,
          wordCount,
        };

        console.log(`[polish] Section "${sectionName}" polished successfully (${changePct}% change, ${wordCount} words)`);
      } catch (sectionError) {
        console.error(`[polish] Error polishing "${sectionName}":`, sectionError);
        // Return original section on error — don't fail the entire polish
        polishedSectionsMap[section.type] = section;
        sectionsFailed++;
        improvementsLog.push(`${sectionName}: ERROR - kept original`);
      }

      // Delay between sections to avoid rate limiting (skip after the last section)
      if (i < sectionsToPolish.length - 1) {
        console.log(`[polish] Waiting ${INTER_SECTION_DELAY_MS / 1000}s before next section...`);
        await new Promise<void>((r) => setTimeout(r, INTER_SECTION_DELAY_MS));
      }
    }

    // Rebuild sections array preserving original order, including bibliography
    const polishedSections: PolishSection[] = article.sections.map((section: PolishSection) => {
      if (section.type === 'bibliography') return section; // Keep bibliography as-is
      return polishedSectionsMap[section.type] || section; // Return polished if available, else original
    });

    const totalWordCount = polishedSections.reduce(
      (sum: number, s: PolishSection) => sum + (s.wordCount || 0),
      0,
    );

    // Calculate average change percentage across polished sections
    const polishedSectionCount = sectionsToPolish.length;
    const avgChangePercentage =
      polishedSectionCount > 0
        ? Math.round(totalChangePercentage / polishedSectionCount)
        : 0;

    const polishedArticle = {
      ...article,
      sections: polishedSections,
      totalWordCount,
      isPolished: true,
    };

    const changesSummary = {
      structural: polishOptions.structural ?? false,
      tone: polishOptions.tone ?? false,
      citations: polishOptions.citations ?? false,
      coherence: polishOptions.coherence ?? false,
      clarity: polishOptions.clarity ?? false,
      vocabulary: polishOptions.vocabulary ?? false,
      grammar: polishOptions.grammar ?? false,
      formatting: polishOptions.formatting ?? false,
      originalWordCount: article.totalWordCount || 0,
      polishedWordCount: totalWordCount,
      wordCountChange: totalWordCount - (article.totalWordCount || 0),
      sectionsPolished: sectionsActuallyModified,
      sectionsFailed,
      changePercentage: avgChangePercentage,
      improvementsMade: improvementsLog.join('; '),
    };

    console.log(`[polish] Polish complete for "${article.title}": ${sectionsActuallyModified} sections modified, ${avgChangePercentage}% avg change`);

    return Response.json({
      success: true,
      result: {
        article: polishedArticle,
        changes: changesSummary,
      },
    });
  } catch (error: unknown) {
    console.error('[polish] POST error:', error);
    const msg = process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan server. Silakan coba lagi.'
      : (error instanceof Error ? error.message : 'Internal server error');
    return Response.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}