import { generateWithEngine, DEFAULT_ENGINE, type AIEngineId } from '@/lib/ai-engine';

export const maxDuration = 300;

// ─── Types ─────────────────────────────────────────────────────────────────────

type VisualType = 'figure' | 'table';

// ─── POST: Generate visual synchronously ──────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      description,
      context,
      articleTitle,
      engineId = DEFAULT_ENGINE,
    } = body as {
      type: VisualType;
      description: string;
      context?: string;
      articleTitle?: string;
      engineId?: AIEngineId;
    };

    if (!type || !description) {
      return Response.json(
        { success: false, error: 'Missing required fields: type, description' },
        { status: 400 }
      );
    }

    console.log(`[visual-gen] Starting ${type} generation: "${description.substring(0, 80)}..."`);

    if (type === 'figure') {
      console.log('[visual-gen] Generating figure image...');
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const prompt = `Academic research figure for a scholarly publication titled "${articleTitle || 'Research'}": ${description}. Professional scientific diagram style, clean vector-like illustration, high contrast, publication-ready quality, white background, precise labels, academic journal standard, crisp and detailed`;
      console.log(`[visual-gen] Figure prompt: ${prompt.substring(0, 200)}...`);

      const isFlowDiagram = /flow|diagram|process/i.test(description);
      const size = isFlowDiagram ? '1152x864' : '1344x768';

      const response = await zai.images.generations.create({ prompt, size });
      const imageBase64 = response.data?.[0]?.base64;

      if (!imageBase64) {
        return Response.json(
          { success: false, error: 'Image generation returned no data' },
          { status: 500 }
        );
      }

      console.log(`[visual-gen] Figure generated: ${imageBase64.length} chars base64`);

      return Response.json({
        success: true,
        result: { success: true, type: 'figure', data: imageBase64, description },
      });
    } else {
      console.log('[visual-gen] Generating table...');
      const systemPrompt = `You are an expert academic data table generator. You generate ONLY markdown tables — no explanations, no preamble, no code blocks. Just the raw markdown table followed by a brief caption.

RULES:
- Generate a professional academic table with realistic but clearly labeled data
- Use markdown pipe syntax: | Header1 | Header2 |
- Include a caption below the table: **Table X:** Caption text
- If the description includes column names, use them exactly
- Data should be plausible and aligned with the research context
- Keep the table concise (5-15 rows max) but information-rich
- Use "—" for missing data`;

      const userPrompt = `Generate an academic table for this research paper:

**Article Title:** ${articleTitle || 'Academic Research Paper'}

**Table Description:** ${description}

${context ? `**Context from the paper:** ${context.substring(0, 1000)}` : ''}

Generate the markdown table now. Output ONLY the table and caption, nothing else.`;

      const result = await generateWithEngine(engineId, systemPrompt, userPrompt, {
        temperature: 0.3,
        maxTokens: 4096,
      });

      if (!result || result.trim().length < 50) {
        return Response.json(
          { success: false, error: 'Table generation returned insufficient content' },
          { status: 500 }
        );
      }

      let cleaned = result.trim();
      cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/i, '');
      cleaned = cleaned.replace(/\n?```\s*$/i, '');
      console.log(`[visual-gen] Table generated: ${cleaned.length} chars`);

      return Response.json({
        success: true,
        result: { success: true, type: 'table', data: cleaned, description },
      });
    }
  } catch (error: any) {
    console.error('[visual-gen] POST error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}