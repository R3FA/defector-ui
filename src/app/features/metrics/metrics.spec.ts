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
  thresholds: {
    categories: {
      screw: {
        threshold: 0.5,
        images: 160,
        good: 41,
        defective: 119,
        at_threshold: {
          tp: 119,
          fp: 37,
          tn: 4,
          fn: 0,
          precision: 0.7628,
          recall: 1.0,
          specificity: 0.0976,
          accuracy: 0.7688,
          f1: 0.8655,
        },
        zero_false_negative: { threshold: 0.5, fp: 37, fn: 0 },
        latency_ms: { mean: 88.2, p50: 62, p95: 205.4, max: 492 },
      },
    },
  },
  latency: {
    backbone: 'resnet18',
    model_load_seconds: 1.4,
    repeats_per_category: 20,
    categories: {
      screw: {
        decode: { mean: 13, p50: 13, p95: 14, max: 15 },
        classify: { mean: 24, p50: 23, p95: 28, max: 30 },
        detect: { mean: 31, p50: 30, p95: 41, max: 45 },
        render: { mean: 120, p50: 119, p95: 125, max: 130 },
        total: { mean: 188, p50: 186, p95: 206, max: 215 },
      },
    },
    share_of_total: {
      render: 0.6506,
      detect: 0.1379,
      classify: 0.1206,
      decode: 0.0909,
    },
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

    // the operating point: a perfect recall that still rejects most good parts
    expect(text).toContain('37 od 41 ispravnih dijelova lažno odbijeno');
    expect(text).toContain('90.2%');

    // the stage breakdown, with rendering dominating
    expect(text).toContain('65.1%');
    expect(text).toContain('188');
    http.verify();
  });

  it('compares against the reference for the backbone actually used', async () => {
    const fixture = TestBed.createComponent(Metrics);
    await fixture.whenStable();

    http.expectOne('/api/metrics').flush({
      detectors: {
        config: { ...PAYLOAD.detectors.config, backbone: 'wide_resnet50_2' },
        runs: [
          {
            category: 'screw',
            metrics: { image_AUROC: 0.9738 },
            fit_seconds: 252,
          },
        ],
      },
    });
    http
      .expectOne((r) => r.url === '/api/analyses/stats')
      .flush({ by_category: {}, daily: [] });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // wide_resnet50_2 reference, not the resnet18 one
    expect(text).toContain('0.960');
    expect(text).toContain('+0.0138');
    expect(text).not.toContain('0.943');
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
