export interface Article {
  id: string;
  titleEn: string;
  titleHi: string;
  slug: string;
  category: string;
  contentEn: string;
  contentHi: string;
  shortDescEn: string;
  shortDescHi: string;
  imageUrl: string;
  author: string;
  publishedAt: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  seoTitle?: string;
  metaDesc?: string;
  keywords?: string[];
  state?: string;
  district?: string;
  viewsCount?: number;
}
