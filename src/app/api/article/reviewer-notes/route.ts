import { generateWithEngine } from '@/lib/ai-engine';

export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewerArticleSection {
  type: string;
  content: string;
  wordCount: number;
}

interface ReviewerArticle {
  title: string;
  sections: ReviewerArticleSection[];
  keywords: string[];
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const REVIEWER_SYSTEM_PROMPT = `You are a CONSORTIUM OF 3 SENIOR PEER REVIEWERS for a Q1 Scopus-indexed journal. Each reviewer has 20+ years of experience and is known for their critical, thorough evaluations.

REVIEWER 1 — Prof. Margaret Chen (Methodology Expert):
Focuses on: research design rigor, methodological appropriateness, data analysis validity, reproducibility, PRISMA compliance, sampling adequacy.

REVIEWER 2 — Prof. James Harrington (Content & Argument Expert):
Focuses on: argument coherence, evidence quality, citation appropriateness, literature gap coverage, theoretical framework depth, logical flow.

REVIEWER 3 — Prof. Aisha Patel (Writing & Presentation Expert):
Focuses on: academic writing quality, clarity, vocabulary precision, structure, readability, APA 7 compliance, redundant language.

INSTRUCTIONS:
1. Read the ENTIRE article carefully
2. For EACH reviewer, provide:
   a) **Overall Assessment** (2-3 sentences)
   b) **Major Issues** (numbered, specific, actionable — each must reference exact text or sections)
   c) **Minor Issues** (numbered, specific)
   d) **Strengths** (what was done well — brief)
3. Be EXTREMELY CRITICAL — this is a Q1 journal review. Point out EVERY weakness.
4. Do NOT be polite. Be precise, specific, and demanding.
5. For each issue, suggest EXACTLY what should be changed.
6. Rate each dimension on a 1-10 scale.
7. Provide an OVERALL RECOMMENDATION: Accept / Minor Revision / Major Revision / Reject

OUTPUT FORMAT:
Return structured JSON with this exact shape:
{
  "reviewers": [
    {
      "name": "Prof. Margaret Chen",
      "role": "Methodology Expert",
      "overallAssessment": "...",
      "majorIssues": ["...", "..."],
      "minorIssues": ["...", "..."],
      "strengths": ["...", "..."],
      "scores": { "methodology": 7, "rigor": 6, ... },
      "recommendation": "Major Revision"
    },
    ... (3 reviewers)
  ],
  "overallScore": 6.5,
  "overallRecommendation": "Major Revision",
  "keyAreasForImprovement": ["Improve PRISMA compliance", "Strengthen theoretical framework", ...],
  "priorityActions": ["1. ...", "2. ...", "3. ..."]
}

You MUST return ONLY valid JSON. No markdown code fences, no commentary, no preamble.`;

// ---------------------------------------------------------------------------
// Build article text for prompt
// ---------------------------------------------------------------------------

function buildArticleText(article: ReviewerArticle): string {
  const sections = article.sections
    .map((s) => `## ${s.type.charAt(0).toUpperCase() + s.type.slice(1).replace(/_/g, ' ')}\n\n${s.content}`)
    .join('\n\n---\n\n');

  return `# ${article.title}

**Keywords:** ${article.keywords.join(', ') || 'N/A'}

---

${sections}`;
}

// ---------------------------------------------------------------------------
// POST: Generate reviewer notes synchronously
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { article } = body as { article: ReviewerArticle };

    if (!article || !article.title || !article.sections || !Array.isArray(article.sections)) {
      return Response.json(
        { success: false, error: 'Article with title and sections is required' },
        { status: 400 },
      );
    }

    const validSections = article.sections.filter(
      (s: ReviewerArticleSection) => s.content?.trim().length > 0,
    );

    if (validSections.length === 0) {
      return Response.json(
        { success: false, error: 'Article must have at least one section with content' },
        { status: 400 },
      );
    }

    console.log(`[reviewer-notes] Starting review for "${article.title}" with ${validSections.length} sections`);

    const articleText = buildArticleText(article);
    const totalWords = articleText.split(/\s+/).filter((w) => w.length > 0).length;

    console.log(`[reviewer-notes] Article "${article.title}" (${totalWords} words)`);

    const userPrompt = `Review the following academic article critically as the consortium of 3 reviewers described in your instructions.

ARTICLE TO REVIEW:

${articleText}

Provide your complete structured review as JSON. Be extremely critical and specific.`;

    const rawResult = (await generateWithEngine('zai', REVIEWER_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.3,
      maxTokens: 16000,
    })) || '';

    if (!rawResult || rawResult.trim().length === 0) {
      return Response.json(
        { success: false, error: 'AI engine returned empty response' },
        { status: 500 },
      );
    }

    // Parse the JSON from the response — handle possible markdown code fences
    let jsonStr = rawResult.trim();

    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let reviewData: any;
    try {
      reviewData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[reviewer-notes] JSON parse failed, attempting extraction...');
      // Try to extract JSON object from the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          reviewData = JSON.parse(jsonMatch[0]);
        } catch {
          return Response.json(
            { success: false, error: 'Failed to parse review response as JSON' },
            { status: 500 },
          );
        }
      } else {
        return Response.json(
          { success: false, error: 'Failed to parse review response as JSON' },
          { status: 500 },
        );
      }
    }

    // Validate minimum structure
    if (!reviewData.reviewers || !Array.isArray(reviewData.reviewers) || reviewData.reviewers.length === 0) {
      return Response.json(
        { success: false, error: 'Review response missing required "reviewers" array' },
        { status: 500 },
      );
    }

    console.log(`[reviewer-notes] Review complete: ${reviewData.reviewers.length} reviewers, overall score ${reviewData.overallScore}`);

    return Response.json({
      success: true,
      result: reviewData,
    });
  } catch (error: any) {
    console.error('[reviewer-notes] POST error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}