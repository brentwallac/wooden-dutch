declare module "@tryghost/admin-api" {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  interface PostData {
    title: string;
    html: string;
    meta_title?: string;
    meta_description?: string;
    tags?: Array<{ name: string }>;
    status?: "draft" | "published" | "scheduled";
    feature_image?: string;
    feature_image_alt?: string;
  }

  interface Post {
    id: string;
    url: string;
    uuid: string;
    title: string;
    slug: string;
    status: string;
  }

  interface Site {
    title: string;
    url: string;
  }

  class GhostAdminAPI {
    constructor(options: GhostAdminAPIOptions);
    posts: {
      add(data: PostData, options?: { source: string }): Promise<Post>;
    };
    images: {
      upload(data: { file: string }): Promise<{ url: string }>;
    };
    site: {
      read(): Promise<Site>;
    };
  }

  export default GhostAdminAPI;
}
