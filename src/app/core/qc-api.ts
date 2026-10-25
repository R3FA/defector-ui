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

/** Raised for a rejected upload (400); the message is already in Bosnian. */
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
      .pipe(this.translated());
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
    return this.http
      .get<AnalysisPage>('/api/analyses', { params })
      .pipe(this.translated());
  }

  analysis(id: number): Observable<Analysis> {
    return this.http
      .get<Analysis>(`/api/analyses/${id}`)
      .pipe(this.translated());
  }

  stats(days = 30): Observable<Stats> {
    return this.http
      .get<Stats>('/api/analyses/stats', { params: { days: String(days) } })
      .pipe(this.translated());
  }

  categories(): Observable<Categories> {
    return this.http.get<Categories>('/api/categories').pipe(this.translated());
  }

  metrics(): Observable<Record<string, unknown>> {
    return this.http
      .get<Record<string, unknown>>('/api/metrics')
      .pipe(this.translated());
  }

  /** Applies translate() to any request, so no caller sees a raw HttpErrorResponse. */
  private translated<T>() {
    return catchError<T, Observable<never>>((error) =>
      throwError(() => this.translate(error as HttpErrorResponse)),
    );
  }

  private translate(error: HttpErrorResponse): Error {
    if (error.status === 409 && error.error?.detail) {
      return new AmbiguousCategoryError(
        error.error.detail as AmbiguousCategory,
      );
    }
    const detail = error.error?.detail;
    const message = typeof detail === 'string' ? bosnian(detail) : null;
    if (error.status === 400) {
      return new UploadRejectedError(message ?? 'Fajl je odbijen.');
    }
    if (error.status === 404) {
      return new Error(message ?? 'Traženi podatak nije pronađen.');
    }
    if (error.status === 0) {
      return new Error(
        'Server nije dostupan. Provjerite da li je defector-api pokrenut na portu 8000.',
      );
    }
    return new Error(`Zahtjev nije uspio (status ${error.status}).`);
  }
}

/**
 * The API answers in English for any client; the interface shows Bosnian.
 * Null for a detail this table does not know, so the caller falls back to a
 * generic message rather than showing English.
 */
function bosnian(detail: string): string | null {
  const limit = detail.match(/larger than the (\d+) MB limit/);
  if (limit) {
    return `Fajl je veći od dozvoljenih ${limit[1]} MB.`;
  }
  const allowed = detail.match(/is not supported; allowed: (.+)$/);
  if (allowed) {
    return `Format fajla nije podržan. Dozvoljeni formati: ${allowed[1]}.`;
  }
  const known: [string, string][] = [
    ['file is empty', 'Učitani fajl je prazan.'],
    ['not a readable image', 'Fajl nije slika koju je moguće pročitati.'],
    ['unreasonably large', 'Rezolucija slike je prevelika.'],
    ['could not be decoded', 'Slika je oštećena i ne može se pročitati.'],
    ['unknown category', 'Nepoznata kategorija dijela.'],
    [
      'no evaluation artifacts',
      'Rezultati evaluacije nisu pronađeni. Pokrenite skripte za evaluaciju.',
    ],
    ['analysis not found', 'Analiza nije pronađena.'],
    ['missing on disk', 'Slika ove analize nedostaje na disku.'],
  ];
  return known.find(([phrase]) => detail.includes(phrase))?.[1] ?? null;
}
