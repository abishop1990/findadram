export interface ExtractedWhiskey {
  name: string;
  distillery?: string;
  type?: string;
  age?: number;
  abv?: number;
  price?: number;
  pour_size?: string;
  notes?: string;
}

export interface ExtractedMenu {
  bar_name?: string;
  whiskeys: ExtractedWhiskey[];
  source_url?: string;
  extraction_method: 'text' | 'vision' | 'review';
  confidence: number;
  source_date?: string;
  scraped_at?: string;
  source_attribution?: string;
  content_hash?: string;
  source_type?: 'website_scrape' | 'google_photo' | 'pdf_menu' | 'user_submitted' | 'manual';
}

export interface TrawlRequest {
  url?: string;
  image?: string;
  image_mime_type?: string;
  bar_id?: string;
}

export interface TrawlResult {
  success: boolean;
  menu?: ExtractedMenu;
  whiskeys_added: number;
  whiskeys_updated: number;
  whiskeys_skipped: number;
  error?: string;
}
