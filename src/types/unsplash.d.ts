// src/types/unsplash.d.ts
export interface UnsplashSearchResponse {
  results: Array<{
    alt_description: string | null;
    urls: {
      raw: string;
      full: string;
      regular: string;
      small: string;
      thumb: string;
    };
  }>;
}
