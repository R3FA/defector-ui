import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Analysis } from '../../core/models';
import { Analyze } from './analyze';

const DEFECTIVE: Analysis = {
  id: 1,
  created_at: '2026-09-06T15:00:00+00:00',
  category: 'metal_nut',
  category_auto: true,
  category_confidence: 0.9999,
  is_defective: true,
  score: 0.9099,
  threshold: 0.5,
  defect_area_px: 4531,
  duration_ms: 24,
  original_url: '/api/analyses/1/original',
  heatmap_url: '/api/analyses/1/heatmap',
};

function pngFile(name = 'part.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, {
    type: 'image/png',
  });
}

describe('Analyze page', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analyze],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders the upload panel', async () => {
    const fixture = TestBed.createComponent(Analyze);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Analiza mašinskog dijela');
    expect(root.querySelector('input[type=file]')).toBeTruthy();
  });

  it('shows the verdict, score and heatmap after a successful analysis', async () => {
    const fixture = TestBed.createComponent(Analyze);
    const page = fixture.componentInstance as unknown as {
      file: { set(v: File): void };
      submit(): void;
    };

    page.file.set(pngFile());
    page.submit();

    http.expectOne('/api/analyze').flush(DEFECTIVE);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('NEISPRAVAN');
    expect(root.textContent).toContain('metal_nut');
    expect(root.textContent).toContain('0.9099');
    expect(root.textContent).toContain('4531');
    expect(root.querySelector('img[alt*="Toplotna"]')).toBeTruthy();
  });

  it('hides the heatmap when the verdict is not localised', async () => {
    const fixture = TestBed.createComponent(Analyze);
    const page = fixture.componentInstance as unknown as {
      file: { set(v: File): void };
      submit(): void;
    };

    page.file.set(pngFile());
    page.submit();
    http.expectOne('/api/analyze').flush({ ...DEFECTIVE, defect_area_px: 0 });
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img[alt*="Toplotna"]')).toBeNull();
    expect(root.textContent).toContain('nije lokalizovan');
  });

  it('offers manual category choice when the backend answers 409', async () => {
    const fixture = TestBed.createComponent(Analyze);
    const page = fixture.componentInstance as unknown as {
      file: { set(v: File): void };
      submit(): void;
    };

    page.file.set(pngFile());
    page.submit();

    http.expectOne('/api/analyze').flush(
      {
        detail: {
          detail: 'not confident',
          confidence: 0.38,
          probabilities: { screw: 0.38, metal_nut: 0.31, cable: 0.31 },
          categories: ['screw', 'metal_nut', 'cable'],
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('nije određena');
    expect(root.textContent).toContain('screw (38%)');
  });

  it('shows the backend message when an upload is rejected', async () => {
    const fixture = TestBed.createComponent(Analyze);
    const page = fixture.componentInstance as unknown as {
      file: { set(v: File): void };
      submit(): void;
    };

    page.file.set(pngFile());
    page.submit();

    http
      .expectOne('/api/analyze')
      .flush(
        { detail: 'the file is not a readable image' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'the file is not a readable image',
    );
  });
});
