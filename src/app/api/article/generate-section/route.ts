import { generateWithEngine, DEFAULT_ENGINE, type AIEngineId } from '@/lib/ai-engine';
import { formatBibliography } from '@/lib/bibliography-formatter';
import { countWords } from '@/lib/count-words';
import type { Reference } from '@/lib/types';

export const maxDuration = 300;

// ─── Types ─────────────────────────────────────────────────────────────────────

type StageId = 'abstract' | 'introduction' | 'methodology' | 'results_discussion' | 'conclusion' | 'bibliography';

// ─── Word Count Helpers ────────────────────────────────────────────────────────

const STAGE_WORD_TARGETS: Record<StageId, number> = {
  abstract: 400,
  introduction: 5250,
  methodology: 2000,
  results_discussion: 7250,
  conclusion: 800,
  bibliography: 0,
};

// ─── Visual Placeholder Parser ────────────────────────────────────────────────

interface VisualPlaceholder {
  id: string;
  type: 'figure' | 'table';
  description: string;
}

function parseVisualPlaceholders(content: string): VisualPlaceholder[] {
  const placeholders: VisualPlaceholder[] = [];
  const regex = /\[(FIGURE|TABLE):\s*(.+?)\]/gi;
  let match;
  let counter = 0;
  while ((match = regex.exec(content)) !== null) {
    counter++;
    placeholders.push({
      id: `visual_${Date.now()}_${counter}`,
      type: match[1].toLowerCase() as 'figure' | 'table',
      description: match[2].trim(),
    });
  }
  return placeholders;
}

// ─── Retry Helper ──────────────────────────────────────────────────────────────

const FALLBACK_PATTERN = /all ai engines are currently unavailable/i;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [12000, 25000, 50000];

async function generateWithRetry(
  stageName: string,
  engine: AIEngineId,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = (await generateWithEngine(engine, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens,
    })) || '';

    if (result && !FALLBACK_PATTERN.test(result) && countWords(result) >= 30) {
      return result;
    }

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(`[section-gen] Attempt ${attempt} insufficient (${countWords(result)} words), retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return '';
}

// ─── Reference Formatting ─────────────────────────────────────────────────────

function formatRefListForPrompt(refs: Reference[], maxRefs = 50): string {
  // Sort by relevance score (descending) and take top N
  const sorted = [...refs]
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, maxRefs);

  return sorted
    .map((r, i) => {
      const parts = [`[${i + 1}] ${r.authors} (${r.year}). ${r.title}`];
      if (r.journal) parts.push(`*${r.journal}*`);
      if (r.doi) parts.push(`DOI: ${r.doi}`);
      // Only include abstract for top 20 to keep prompt size manageable
      if (r.abstract && i < 20) parts.push(`Abstract: ${r.abstract.substring(0, 200)}`);
      return parts.join(', ');
    })
    .join('\n');
}

// ─── Build Previous Sections Context ──────────────────────────────────────────

interface PreviousSection {
  id: StageId;
  label: string;
  content: string;
}

function buildPreviousContext(previousSections: PreviousSection[]): string {
  if (!previousSections || previousSections.length === 0) return '';
  return '\n\n## PREVIOUSLY GENERATED SECTIONS (for continuity)\n\n' +
    previousSections.map((s) => `### ${s.label}\n${s.content.substring(0, 2000)}...\n`).join('\n');
}

// ─── CONSILIUM PROFESSORUM MODE ───────────────────────────────────────────────

const CONSILIUM_SYSTEM = `You are CONSILIUM PROFESSORUM — a consortium of 20 world-class professors co-authoring this paper.

REPRESENTED EXPERTISE:
1. Prof. of Research Methodology (quantitative & qualitative)
2. Prof. of Academic Writing & Rhetoric
3. Prof. of the specific research domain
4. Prof. of Statistical Analysis
5. Prof. of Literature Synthesis & Meta-Analysis
6. Prof. of Theoretical Frameworks
7. Prof. of Critical Analysis
8. Prof. of APA 7th Edition Citation Standards
9. Prof. of Research Ethics
10. Prof. of Peer Review Standards

CONSENSUS RULES:
- Every sentence must pass scrutiny from ALL 20 professors
- Use ONLY the provided references — ZERO fabricated citations or data
- Academic rigor: precise terminology, logical flow, evidence-based claims
- CRITICAL: Every in-text citation (Author, Year) MUST correspond to a reference in the provided list
- Do NOT cite references not in the provided list
- Do NOT fabricate years, DOIs, or journal names
- Write in formal academic English with sophisticated vocabulary

OUTPUT FORMAT — TOKEN-EFFICIENT PURE TEXT:
- Write pure academic prose — minimal markdown formatting (only headings with # and ##, bold for key terms)
- For figures and diagrams, use this EXACT placeholder format:
  [FIGURE: descriptive title and what the figure should show]
- For data tables, use this EXACT placeholder format:
  [TABLE: descriptive title | Column1 | Column2 | Column3 | brief data description]
- Do NOT generate actual markdown tables or embed images — use placeholders ONLY
- This saves tokens and allows on-demand premium visual generation later`;

// ─── Per-Stage Prompt Builders ────────────────────────────────────────────────

function buildStagePrompt(
  stageId: StageId,
  title: string,
  keywords: string[],
  references: Reference[],
  researchMethod: string,
  additionalContext: string,
  previousSections: PreviousSection[],
): { systemPrompt: string; userPrompt: string; maxTokens: number } {
  const currentYear = new Date().getFullYear();
  const refList = formatRefListForPrompt(references);
  const prevCtx = buildPreviousContext(previousSections);
  const validRefs = references.filter(
    (r) => {
      const y = parseInt(String(r.year));
      return !isNaN(y) && y >= 1990 && y <= currentYear && r.title && r.title.length > 10;
    }
  );
  const refCount = validRefs.length;
  const years = validRefs.map((r) => parseInt(String(r.year)));
  const minYear = years.length > 0 ? Math.min(...years) : 2000;
  const maxYear = years.length > 0 ? Math.max(...years) : currentYear;

  const baseContext = `## ARTICLE CONTEXT
Title: "${title}"
Keywords: ${keywords.join(', ')}
Research Method: ${researchMethod}
Total References Available: ${refCount}
Reference Year Range: ${minYear}–${maxYear}
${additionalContext ? `\n## ADDITIONAL USER INSTRUCTIONS\n${additionalContext}` : ''}

## AVAILABLE REFERENCES (use ONLY these — cite by Author, Year)
${refList}`;

  switch (stageId) {
    case 'abstract': {
      const target = STAGE_WORD_TARGETS.abstract;
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}

## YOUR TASK: Write the ABSTRACT

Write a comprehensive abstract of EXACTLY ${target} words (±20 words). The abstract must:

1. **Background** (2-3 sentences): Establish the research context and significance
2. **Objective** (1-2 sentences): State the research aim and questions
3. **Method** (2-3 sentences): Describe the ${researchMethod.replace(/-/g, ' ')} methodology used
4. **Results** (3-4 sentences): Present the KEY findings (must align with the literature)
5. **Conclusion** (2-3 sentences): State the main contributions and implications
6. **Keywords**: End with "Keywords: " followed by 5-7 relevant keywords

WORD COUNT TARGET: ${target} words — this is MANDATORY.
Use APA 7th in-text citations: (Author, Year).
Do NOT include a title, author names, or section header — start directly with the text.`,
        maxTokens: 4096,
      };
    }

    case 'introduction': {
      const target = STAGE_WORD_TARGETS.introduction;
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}${prevCtx}

## YOUR TASK: Write the INTRODUCTION (including Literature Review)

This is the LARGEST section. You MUST write at least ${target} words. Structure it as follows:

### 1.1 Background and Research Context (~800 words)
- Broad context of the research domain
- Current trends, developments, and significance
- Why this topic matters NOW — use recent references (post-2020 preferred)
- Statistical context: market size, adoption rates, or relevant metrics from references

### 1.2 Literature Review (~3000 words)
This is the CORE of the introduction. Organise by thematic clusters:

**Sub-section 1.2.1: Theoretical Foundations** (~800 words)
- Foundational theories and frameworks
- Evolution of key concepts over time
- Map the theoretical landscape using your references

**Sub-section 1.2.2: Empirical Evidence** (~1000 words)
- Key empirical studies and their findings
- Patterns, trends, and consensus across the literature
- Conflicting findings and ongoing debates
- Include at least 2 [FIGURE: ...] or [TABLE: ...] placeholders summarising literature themes

**Sub-section 1.2.3: Research Gaps** (~700 words)
- What is NOT yet known — identify 3-5 specific gaps
- Limitations of existing studies
- Why these gaps matter for theory and practice

**Sub-section 1.2.4: Positioning of This Study** (~500 words)
- How this study addresses the identified gaps
- Novelty and contribution claims
- Relationship to existing frameworks

### 1.3 Research Questions and Objectives (~450 words)
- State 3-4 specific research questions (RQ1, RQ2, RQ3, RQ4)
- Define clear, measurable objectives
- Explain how each RQ connects to identified gaps

### 1.4 Article Structure (~200 words)
- Brief overview of the paper's organisation
- What each subsequent section covers

WORD COUNT TARGET: ${target} words MINIMUM — this is MANDATORY.
Use HEAVY citation density: aim for 2-3 citations per paragraph.
Use ONLY references from the provided list.
Include [FIGURE: ...] and [TABLE: ...] placeholders where appropriate.`,
        maxTokens: 32000,
      };
    }

    case 'methodology': {
      const target = STAGE_WORD_TARGETS.methodology;
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}${prevCtx}

## YOUR TASK: Write the METHODOLOGY

Write at least ${target} words following the ${researchMethod.replace(/-/g, ' ')} approach. Structure:

### 2.1 Research Design and Approach (~500 words)
- Philosophical paradigm (positivism, interpretivism, pragmatism)
- Research approach (deductive, inductive, abductive)
- Justification for ${researchMethod.replace(/-/g, ' ')} methodology
- Alignment with research questions

### 2.2 Search Strategy (~600 words)
- Databases searched (Scopus, Web of Science, PubMed, etc.)
- Search strings and Boolean operators used
- Time frame: ${minYear}–${maxYear}
- Language restrictions and inclusion criteria

Include a [TABLE: Search Strategy and Database Coverage | Database | Search String | Results | After Duplicates | Screened | Included | with realistic numbers aligned to your ${refCount} references]

### 2.3 Inclusion and Exclusion Criteria (~400 words)
- Population/participant criteria
- Intervention/exposure criteria
- Outcome measures
- Study design criteria
- Clear justification for each criterion

### 2.4 Data Extraction and Quality Assessment (~300 words)
- Data extraction process and variables
- Quality appraisal tool (e.g., CASP, JBI, Newcastle-Ottawa)
- Risk of bias assessment approach

### 2.5 Data Analysis and Synthesis (~200 words)
- Analytical framework used
- Thematic analysis / content analysis / statistical methods
- Software tools (NVivo, ATLAS.ti, R, etc.)

WORD COUNT TARGET: ${target} words MINIMUM.
Include [TABLE: ...] and [FIGURE: ...] placeholders where appropriate.
Cite methodological references from your list.`,
        maxTokens: 16000,
      };
    }

    case 'results_discussion': {
      const target = STAGE_WORD_TARGETS.results_discussion;
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}${prevCtx}

## YOUR TASK: Write RESULTS AND DISCUSSION

This is the LARGEST section of the paper. Write at least ${target} words total.

### PART A: RESULTS (~3500 words)

#### 3.1 Study Selection Process (~400 words)
- PRISMA flow description
- Numbers at each stage (identification, screening, eligibility, included)

Include: [FIGURE: PRISMA 2020 Flow Diagram showing identification (n=XXX records identified), screening (n=XXX after duplicates removed), eligibility (n=XXX after full-text review), and included (n=XXX final studies) with specific exclusion reasons]

#### 3.2 Characteristics of Included Studies (~600 words)
- Overview of study characteristics
- Geographic distribution, year distribution, methodology types

Include: [TABLE: Characteristics of Included Studies | # | Author(s) | Year | Country | Study Design | Sample Size | Key Findings | with ${Math.min(refCount, 15)} rows representing the most relevant references]

#### 3.3 Thematic Analysis Results (~2500 words)
Present findings organised by your research questions:

**RQ1: [First Research Question]** (~700 words)
- Present thematic findings with supporting evidence
- Include frequency counts or prevalence data where available
- Cite specific studies supporting each theme

Include: [TABLE: Thematic Analysis — RQ1 Findings | Theme | Frequency | Supporting Studies | Key Evidence | with realistic data]

**RQ2: [Second Research Question]** (~700 words)
- Same structure as RQ1
- Cross-reference with RQ1 findings where relevant

Include: [TABLE: Thematic Analysis — RQ2 Findings | Theme | Frequency | Supporting Studies | Key Evidence]

**RQ3: [Third Research Question]** (~600 words)
- Present findings with evidence
- Note patterns across studies

**RQ4: [Fourth Research Question]** (~500 words)
- Final research question findings
- Synthesis with previous RQs

### PART B: DISCUSSION (~3750 words)

#### 4.1 Interpretation of Key Findings (~1000 words)
- What the results MEAN in the broader context
- How findings relate to theoretical frameworks from the introduction
- Surprising or unexpected findings and possible explanations

#### 4.2 Theoretical Contributions (~800 words)
- How findings advance existing theory
- New theoretical insights or framework extensions
- Resolution of theoretical debates identified in literature review

#### 4.3 Practical Implications (~700 words)
- Actionable recommendations for practitioners
- Policy implications
- Industry applications

#### 4.4 Comparison with Previous Studies (~700 words)
- How findings align or contrast with prior research
- Explain divergences using methodological or contextual differences
- Update the theoretical landscape

#### 4.5 Limitations (~300 words)
- Honest assessment of methodological limitations
- Constraints of ${researchMethod.replace(/-/g, ' ')} approach
- Potential biases in the analysis

#### 4.6 Future Research Directions (~250 words)
- Specific, actionable suggestions for future work
- Emerging questions raised by this study

WORD COUNT TARGET: ${target} words MINIMUM — this is MANDATORY.
Use EXTENSIVE citations throughout.
Include at least 4-6 [TABLE: ...] and 1-2 [FIGURE: ...] placeholders.
Make the discussion directly reference and interpret the results presented above.`,
        maxTokens: 32000,
      };
    }

    case 'conclusion': {
      const target = STAGE_WORD_TARGETS.conclusion;
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}${prevCtx}

## YOUR TASK: Write the CONCLUSION

Write at least ${target} words. Structure:

### 5.1 Synthesis of Key Findings (~300 words)
- Concise summary of the 4-6 most important findings
- Direct answers to each research question
- Evidence-based statements only

### 5.2 Theoretical and Practical Contributions (~250 words)
- What this study adds to the academic field
- How practitioners can apply the findings
- Novel insights produced by this research

### 5.3 Limitations and Future Directions (~250 words)
- Key limitations acknowledged
- 3-4 specific, actionable future research directions
- How the field should evolve based on these findings

WORD COUNT TARGET: ${target} words MINIMUM.
Do NOT introduce new references or data not discussed previously.
End with a strong closing statement about the significance of this work.`,
        maxTokens: 8192,
      };
    }

    case 'bibliography': {
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}${prevCtx}

## YOUR TASK: Compile the BIBLIOGRAPHY

Extract ALL in-text citations from the previously generated sections and compile them into a properly formatted APA 7th Edition reference list.

RULES:
1. Include ONLY references that were actually cited in the text
2. Every citation (Author, Year) in the body text must appear here
3. Every reference here must have been cited in the text
4. Use APA 7th Edition format precisely
5. Alphabetical order by first author surname
6. Use hanging indent format (represented in markdown)
7. Include DOIs where available
8. DO NOT add any references not in the provided list

Format each entry as:
Author, A. B., & Author, C. D. (Year). Title of article. *Journal Name*, *Volume*(Issue), Pages. https://doi.org/xxx

Compile the complete bibliography now.`,
        maxTokens: 16000,
      };
    }

    default:
      return {
        systemPrompt: CONSILIUM_SYSTEM,
        userPrompt: `${baseContext}\n\nWrite the ${stageId} section.`,
        maxTokens: 16000,
      };
  }
}

// ─── POST: Generate section synchronously ─────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stageId,
      title,
      keywords,
      references,
      researchMethod,
      additionalInstructions,
      engineId = DEFAULT_ENGINE,
      previousSections = [],
    } = body as {
      stageId: StageId;
      title: string;
      keywords: string[];
      references: Reference[];
      researchMethod: string;
      additionalInstructions?: string;
      engineId?: AIEngineId;
      previousSections?: PreviousSection[];
    };

    if (!stageId || !title || !references || references.length === 0) {
      return Response.json(
        { success: false, error: 'Missing required fields: stageId, title, references' },
        { status: 400 }
      );
    }

    console.log(`[section-gen] Starting ${stageId} generation with ${references.length} references`);

    const { systemPrompt, userPrompt, maxTokens } = buildStagePrompt(
      stageId, title, keywords, references, researchMethod, additionalInstructions || '', previousSections,
    );

    const content = await generateWithRetry(
      stageId, engineId, systemPrompt, userPrompt, maxTokens,
    );

    if (!content || content.trim().length === 0) {
      return Response.json(
        { success: false, error: `Failed to generate ${stageId} after ${MAX_RETRIES} attempts` },
        { status: 500 }
      );
    }

    const wordCount = countWords(content);

    let finalContent = content;
    if (stageId === 'bibliography') {
      try {
        const selectedRefs = references.filter((r) => r.isSelected);
        // Map Reference[] to RealReference[] (only fields that RealReference requires)
        const realRefs: import('@/lib/reference-search').RealReference[] = selectedRefs.map((r) => ({
          id: r.id,
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
          relevanceScore: r.relevanceScore ?? 0,
          refType: r.refType || 'Journal Article',
          isSelected: r.isSelected,
        }));
        finalContent = formatBibliography(realRefs);
      } catch (e) {
        console.warn('[section-gen] Bibliography formatter failed, using AI-generated version:', e);
      }
    }

    const visualPlaceholders = parseVisualPlaceholders(finalContent);

    console.log(`[section-gen] Stage ${stageId} complete: ${wordCount} words, ${visualPlaceholders.length} visual placeholders`);

    return Response.json({
      success: true,
      result: {
        success: true,
        content: finalContent,
        wordCount,
        visualPlaceholders,
        stageId,
      },
    });
  } catch (error: any) {
    console.error('[section-gen] POST error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}