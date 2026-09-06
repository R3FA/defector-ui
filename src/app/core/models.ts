/**
 * Response shapes returned by defector-api.
 *
 * These mirror src/defector/api/contracts.py. If a field changes there it has
 * to change here too; the OpenAPI schema at /docs is the reference.
 */

export interface Analysis {
  id: number;
  /** ISO 8601 with an explicit UTC offset. */
  created_at: string;
  category: string;
  /** False when the caller supplied the category instead of the classifier. */
  category_auto: boolean;
  /** Null when the category was chosen manually. */
  category_confidence: number | null;
  is_defective: boolean;
  score: number;
  threshold: number;
  /** Pixels above the pixel threshold. Zero means the verdict is not localised. */
  defect_area_px: number;
  duration_ms: number;
  original_url: string;
  heatmap_url: string;
}

export interface AnalysisPage {
  items: Analysis[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoryInfo {
  name: string;
  threshold: number;
}

export interface Categories {
  categories: CategoryInfo[];
  confidence_threshold: number;
}

export interface CategoryStats {
  total: number;
  defective: number;
  rate: number;
}

export interface DailyPoint {
  day: string;
  total: number;
  defective: number;
  rate: number;
}

export interface Stats {
  by_category: Record<string, CategoryStats>;
  daily: DailyPoint[];
}

/** Body of the 409 returned when the classifier is not confident enough. */
export interface AmbiguousCategory {
  detail: string;
  confidence: number;
  probabilities: Record<string, number>;
  categories: string[];
}

export interface HistoryFilters {
  category?: string | null;
  defective?: boolean | null;
  limit?: number;
  offset?: number;
}
