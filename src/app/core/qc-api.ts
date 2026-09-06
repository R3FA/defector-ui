import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  AmbiguousCategory,
  Analysis,
  AnalysisPage,
  Categories,
  HistoryFilters,
  Stats,
} from './models';

/**
 * Raised when the backend answers 409: the classifier was not confident enough
 * to route the upload. Carries the per-category probabilities so the user can
 * be asked to choose, which is the manual fallback the backend expects.
 */
export class AmbiguousCategoryError extends Error {
  constructor(readonly info: AmbiguousCategory) {
    super(info.detail);
    this.name = 'AmbiguousCategoryError';
  }
}

/** Raised for a rejected upload (400) so the message can be shown verbatim. */
export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejectedError';
  }
}

@Service()
export class QcApi {
  private readonly http = inject(HttpClient);

  /**
   * Uploads an image. Leave category undefined to let the backend route it.
   *
   * The default fetch backend does not report upload progress. That is
   * acceptable here: the images are a few hundred kilobytes and the round trip
   * is well under a second, so a spinner is enough and withXhr() is not needed.
   */
  analyze(file: File, category?: string | null): Observable<Analysis> {
    const body = new FormData();
    body.append('file', file, file.name);
    if (category) {
      body.append('category', category);
    }
    return this.http
      .post<Analysis>('/api/analyze', body)
      .pipe(catchError((error) => throwError(() => this.translate(error))));
  }

  history(filters: HistoryFilters = {}): Observable<AnalysisPage> {
    const params: Record<string, string> = {
      limit: String(filters.limit ?? 50),
      offset: String(filters.offset ?? 0),
    };
    if (filters.category) {
      params['category'] = filters.category;
    }
    if (filters.defective !== null && filters.defective !== undefined) {
      params['defective'] = String(filters.defective);
    }
    return this.http.get<AnalysisPage>('/api/analyses', { params });
  }

  analysis(id: number): Observable<Analysis> {
    return this.http.get<Analysis>(`/api/analyses/${id}`);
  }

  stats(days = 30): Observable<Stats> {
    return this.http.get<Stats>('/api/analyses/stats', { params: { days: String(days) } });
  }

  categories(): Observable<Categories> {
    return this.http.get<Categories>('/api/categories');
  }

  metrics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/metrics');
  }

  private translate(error: HttpErrorResponse): Error {
    if (error.status === 409 && error.error?.detail) {
      return new AmbiguousCategoryError(error.error.detail as AmbiguousCategory);
    }
    if (error.status === 400) {
      const detail = error.error?.detail;
      return new UploadRejectedError(
        typeof detail === 'string' ? detail : 'the upload was rejected',
      );
    }
    if (error.status === 0) {
      return new Error('the backend is not reachable; is defector-api running on port 8000?');
    }
    return new Error(`request failed with status ${error.status}`);
  }
}
