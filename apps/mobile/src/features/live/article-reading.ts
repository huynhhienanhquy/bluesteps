import type { Schemas } from '../../services/api';

export function estimatedReadingMinutes(article: Schemas['Article']) {
  const text = article.blocks.map((block) => block.text ?? '').join(' ') || article.summary;
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}

export function articleCoverUrl(article?: Schemas['Article']) {
  return article?.blocks.find((block) => block.type === 'gallery' && block.images?.length)
    ?.images?.[0]?.url;
}
