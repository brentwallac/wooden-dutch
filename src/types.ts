export interface ArticleTopic {
  headline: string;
  subheadline: string;
  angle: string;
  tags: string[];
}

export interface GeneratedArticle {
  title: string;
  html: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  authorName: string;
  authorSlug: string;
  featureImageUrl?: string;
}

export interface PipelineResult {
  topic: ArticleTopic;
  article: GeneratedArticle;
  ghostUrl?: string;
  publishedAt?: string;
}

export interface EditorialReview {
  score: number;
  toneCorrect: boolean;
  wordCountOk: boolean;
  satireQuality: "weak" | "good" | "excellent";
  htmlValid: boolean;
  feedback: string;
}

export interface DraftArticle {
  id: string;
  generatedAt: string;
  topic: ArticleTopic;
  article: GeneratedArticle;
  status: "draft" | "published";
  publishedAt: string | null;
  ghostUrl: string | null;
}
