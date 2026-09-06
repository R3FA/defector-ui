import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { LatencyReport, Stats, ThresholdReport } from '../../core/models';
import { QcApi } from '../../core/qc-api';

/** One row of the detector table, flattened from artifacts/metrics.json. */
interface DetectorRow {
  category: string;
  imageAuroc: number;
  pixelAuroc: number;
  aupro: number;
  f1Max: number;
  fitMinutes: number;
  /** Published PatchCore figure for the same backbone, for comparison. */
  published: number | null;
}

/**
 * Published image-level AUROC for PatchCore with a resnet18 backbone, from the
 * anomalib benchmark. Shown next to the measured numbers so the table answers
 * "is this in the right range" without leaving the page.
 */
const PUBLISHED_RESNET18: Record<string, number> = {
  screw: 0.943,
  metal_nut: 0.991,
  cable: 0.986,
};

@Component({
  selector: 'app-metrics',
  imports: [
    DecimalPipe,
    PercentPipe,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  templateUrl: './metrics.html',
  styleUrl: './metrics.scss',
})
export class Metrics {
  private readonly api = inject(QcApi);

  protected readonly busy = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly payload = signal<Record<string, any> | null>(null);
  protected readonly stats = signal<Stats | null>(null);

  protected readonly detectorColumns = [
    'category',
    'imageAuroc',
    'published',
    'pixelAuroc',
    'aupro',
    'f1Max',
    'fitMinutes',
  ];
  protected readonly liveColumns = ['category', 'total', 'defective', 'rate'];
  protected readonly thresholdColumns = [
    'category',
    'threshold',
    'tp',
    'fp',
    'tn',
    'fn',
    'recall',
    'precision',
  ];
  protected readonly stageColumns = [
    'category',
    'decode',
    'classify',
    'detect',
    'render',
    'total',
  ];

  protected readonly config = computed(
    () => this.payload()?.['detectors']?.config ?? null,
  );

  protected readonly detectors = computed<DetectorRow[]>(() => {
    const runs = this.payload()?.['detectors']?.runs ?? [];
    return runs.map((run: any) => ({
      category: run.category,
      imageAuroc: run.metrics?.image_AUROC ?? 0,
      pixelAuroc: run.metrics?.pixel_AUROC ?? 0,
      aupro: run.metrics?.pixel_AUPRO ?? 0,
      f1Max: run.metrics?.image_F1Max ?? 0,
      fitMinutes: (run.fit_seconds ?? 0) / 60,
      published: PUBLISHED_RESNET18[run.category] ?? null,
    }));
  });

  protected readonly classifier = computed(
    () => this.payload()?.['classifier'] ?? null,
  );
  protected readonly ablation = computed(
    () => this.payload()?.['routing_ablation'] ?? null,
  );

  protected readonly ablationRows = computed(() => {
    const strategies = this.ablation()?.strategies ?? {};
    return Object.entries(strategies).map(([name, value]: [string, any]) => ({
      name,
      accuracy: value.accuracy,
      errors: value.errors,
      ties: value.ties,
    }));
  });

  /**
   * The operating point, which AUROC does not describe. A high AUROC can still
   * sit on a threshold that rejects most good parts, and that is what these
   * rows show.
   */
  protected readonly thresholdRows = computed(() => {
    const categories: Record<string, ThresholdReport> =
      this.payload()?.['thresholds']?.categories ?? {};
    return Object.entries(categories).map(([category, report]) => ({
      category,
      threshold: report.threshold,
      ...report.at_threshold,
      good: report.good,
      zeroFn: report.zero_false_negative,
      falseAlarmRate: report.good ? report.at_threshold.fp / report.good : 0,
    }));
  });

  protected readonly latency = computed<LatencyReport | null>(
    () => this.payload()?.['latency'] ?? null,
  );

  protected readonly stageRows = computed(() => {
    const categories = this.latency()?.categories ?? {};
    return Object.entries(categories).map(([category, stages]) => ({
      category,
      decode: stages['decode'],
      classify: stages['classify'],
      detect: stages['detect'],
      render: stages['render'],
      total: stages['total'],
    }));
  });

  protected readonly shares = computed(() => {
    const share = this.latency()?.share_of_total ?? {};
    return Object.entries(share)
      .map(([stage, value]) => ({ stage, value }))
      .sort((a, b) => b.value - a.value);
  });

  protected readonly liveRows = computed(() => {
    const byCategory = this.stats()?.by_category ?? {};
    return Object.entries(byCategory).map(([category, value]) => ({
      category,
      ...value,
    }));
  });

  constructor() {
    this.api.metrics().subscribe({
      next: (data) => {
        this.payload.set(data as Record<string, any>);
        this.busy.set(false);
      },
      error: (failure: Error) => {
        this.error.set(failure.message);
        this.busy.set(false);
      },
    });

    this.api.stats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set(null),
    });
  }

  protected delta(row: DetectorRow): number | null {
    return row.published === null ? null : row.imageAuroc - row.published;
  }
}
