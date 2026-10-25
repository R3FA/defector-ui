import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { bosnianLocale } from '../../core/locale';
import { Analysis } from '../../core/models';
import { History } from './history';

function row(id: number, category: string, defective: boolean): Analysis {
  return {
    id,
    created_at: '2026-09-06T15:00:00+00:00',
    category,
    category_auto: true,
    category_confidence: 0.999,
    is_defective: defective,
    score: defective ? 0.9 : 0.4,
    threshold: 0.5,
    defect_area_px: defective ? 1200 : 0,
    duration_ms: 23,
    original_url: `/api/analyses/${id}/original`,
    heatmap_url: `/api/analyses/${id}/heatmap`,
  };
}

describe('History page', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideZonelessChangeDetection(),
        bosnianLocale,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('renders rows with verdict tags and honours the filters', async () => {
    const fixture = TestBed.createComponent(History);
    await fixture.whenStable();

    http.expectOne('/api/categories').flush({
      categories: [
        { name: 'screw', threshold: 0.5 },
        { name: 'metal_nut', threshold: 0.5 },
      ],
      confidence_threshold: 0.9,
    });

    const first = http.expectOne((r) => r.url === '/api/analyses');
    expect(first.request.params.get('limit')).toBe('25');
    expect(first.request.params.get('offset')).toBe('0');
    first.flush({
      items: [row(2, 'screw', true), row(1, 'metal_nut', false)],
      total: 2,
      limit: 25,
      offset: 0,
    });
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ukupno zapisa: 2');
    const tags = Array.from(root.querySelectorAll('.tag')).map((t) =>
      t.textContent?.trim(),
    );
    expect(tags).toEqual(['NOK', 'OK']);

    // Changing a filter refetches with the query parameter attached.
    const page = fixture.componentInstance as unknown as {
      setCategory(v: string): void;
    };
    page.setCategory('screw');
    await fixture.whenStable();

    const filtered = http.expectOne((r) => r.url === '/api/analyses');
    expect(filtered.request.params.get('category')).toBe('screw');
    filtered.flush({
      items: [row(2, 'screw', true)],
      total: 1,
      limit: 25,
      offset: 0,
    });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ukupno zapisa: 1',
    );
    http.verify();
  });

  it('shows an empty state when nothing matches', async () => {
    const fixture = TestBed.createComponent(History);
    await fixture.whenStable();

    http
      .expectOne('/api/categories')
      .flush({ categories: [], confidence_threshold: 0.9 });
    http
      .expectOne((r) => r.url === '/api/analyses')
      .flush({ items: [], total: 0, limit: 25, offset: 0 });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Nema zapisa za odabrane filtere',
    );
    http.verify();
  });
});
