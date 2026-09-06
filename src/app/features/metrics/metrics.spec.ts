import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Metrics } from './metrics';

const PAYLOAD = {
  detectors: {
    config: {
      backbone: 'resnet18',
      coreset_sampling_ratio: 0.01,
      image_size: [256, 256],
      center_crop_size: [224, 224],
      accelerator: 'cpu',
    },
    runs: [
      {
        category: 'screw',
        metrics: {
          image_AUROC: 0.9527,
          pixel_AUROC: 0.9823,
          pixel_AUPRO: 0.9051,
          image_F1Max: 0.9362,
        },
        fit_seconds: 186,
      },
    ],
  },
  classifier: {
    backbone: 'resnet18',
    feature_dim: 512,
    cv_accuracy_mean: 1.0,
    test_accuracy: 1.0,
    test_images: 425,
    confidence_threshold: 0.9,
    below_threshold: 1,
  },
  routing_ablation: {
    images: 425,
    saturated_at_one: 415,
    strategies: {
      'A normalised pred_score': { accuracy: 0.8682, errors: 56, ties: 80 },
      'C mean raw distance': { accuracy: 1.0, errors: 0, ties: 0 },
    },
  },
};

describe('Metrics page', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Metrics],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('renders detector, classifier and ablation results', async () => {
    const fixture = TestBed.createComponent(Metrics);
    await fixture.whenStable();

    http.expectOne('/api/metrics').flush(PAYLOAD);
    http
      .expectOne((r) => r.url === '/api/analyses/stats')
      .flush({
        by_category: { screw: { total: 4, defective: 3, rate: 0.75 } },
        daily: [],
      });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    // measured against the published figure, with the delta
    expect(text).toContain('0.9527');
    expect(text).toContain('0.943');
    expect(text).toContain('+0.0097');

    // classifier report
    expect(text).toContain('100.00%');
    expect(text).toContain('425');

    // the ablation, including why the naive strategy fails
    expect(text).toContain('A normalised pred_score');
    expect(text).toContain('0.8682');
    expect(text).toContain('415');

    // live defect rate from the history
    expect(text).toContain('75%');
    http.verify();
  });

  it('shows an error when the artifacts are missing', async () => {
    const fixture = TestBed.createComponent(Metrics);
    await fixture.whenStable();

    http.expectOne('/api/metrics').flush(
      { detail: 'no evaluation artifacts found' },
      {
        status: 404,
        statusText: 'Not Found',
      },
    );
    http
      .expectOne((r) => r.url === '/api/analyses/stats')
      .flush({ by_category: {}, daily: [] });
    await fixture.whenStable();

    // The service surfaces the backend's own detail rather than a generic
    // status message, so the user is told what is actually missing.
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'no evaluation artifacts found',
    );
    http.verify();
  });
});
