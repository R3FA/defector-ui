import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { bosnianLocale } from '../../core/locale';
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
        bosnianLocale,
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
    expect(root.textContent).toContain('0,9099');
    expect(root.textContent).toContain('4.531');
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

  it('shows the rejection in Bosnian when an upload is rejected', async () => {
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
      'Fajl nije slika koju je moguće pročitati.',
    );
  });

  it('previews the selected file and releases the previous object URL', async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    let counter = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:test/${++counter}`;
      created.push(url);
      return url;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      revoked.push(url);
    });

    const fixture = TestBed.createComponent(Analyze);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type=file]',
    ) as HTMLInputElement;

    const dispatch = (file: File) => {
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      input.dispatchEvent(new Event('change'));
    };

    dispatch(pngFile('first.png'));
    await fixture.whenStable();
    let preview = (fixture.nativeElement as HTMLElement).querySelector(
      '.preview img',
    );
    expect(preview?.getAttribute('src')).toBe(created[0]);
    expect(revoked).toEqual([]);

    // Picking again must release the first blob rather than leak it.
    dispatch(pngFile('second.png'));
    await fixture.whenStable();
    expect(revoked).toEqual([created[0]]);
    preview = (fixture.nativeElement as HTMLElement).querySelector(
      '.preview img',
    );
    expect(preview?.getAttribute('src')).toBe(created[1]);

    vi.restoreAllMocks();
  });

  it('replaces the preview with the analysed images once a result arrives', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test/x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(Analyze);
    const page = fixture.componentInstance as unknown as {
      file: { set(v: File): void };
      previewUrl: { set(v: string): void };
      submit(): void;
    };
    page.file.set(pngFile());
    page.previewUrl.set('blob:test/x');
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.preview img'),
    ).toBeTruthy();

    page.submit();
    http.expectOne('/api/analyze').flush(DEFECTIVE);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.preview img')).toBeNull();
    expect(root.querySelector('img[alt*="Toplotna"]')).toBeTruthy();

    vi.restoreAllMocks();
  });
});
