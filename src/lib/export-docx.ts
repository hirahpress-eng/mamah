import type { GeneratedArticle } from '@/store/article-store';

/**
 * Export a GeneratedArticle as a downloadable .docx file.
 * Calls the /api/export/docx endpoint and triggers a browser download.
 */
export async function exportToDocx(article: GeneratedArticle): Promise<void> {
  const response = await fetch('/api/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(article),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error ?? `DOCX export failed (HTTP ${response.status})`);
  }

  const blob = await response.blob();

  // Build filename: {sanitised_title}_article.docx
  // Only strip filesystem-unsafe chars — preserve Unicode/Indonesian
  const sanitisedTitle = article.title
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .toLowerCase();
  const filename = `${sanitisedTitle}_article.docx`;

  // Trigger download via blob URL
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
