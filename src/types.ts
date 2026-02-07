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
}

export interface PipelineResult {
  topic: ArticleTopic;
  article: GeneratedArticle;
  ghostUrl?: string;
  publishedAt?: string;
}
