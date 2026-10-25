import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { AmbiguousCategory, Analysis } from '../../core/models';
import { AmbiguousCategoryError, QcApi } from '../../core/qc-api';

@Component({
  selector: 'app-analyze',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './analyze.html',
  styleUrl: './analyze.scss',
})
export class Analyze {
  private readonly api = inject(QcApi);

  protected readonly file = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly result = signal<Analysis | null>(null);
  protected readonly error = signal<string | null>(null);

  /** Set when the backend answers 409 and the user has to pick a category. */
  protected readonly ambiguous = signal<AmbiguousCategory | null>(null);
  protected readonly chosenCategory = signal<string | null>(null);

  /**
   * A verdict with no pixels above the pixel threshold cannot be localised.
   * The image and pixel thresholds are calibrated separately, so they can
   * disagree; showing the heatmap in that case would display an image
   * identical to the original and read as a loading failure.
   */
  protected readonly localised = computed(
    () => (this.result()?.defect_area_px ?? 0) > 0,
  );

  protected readonly scorePercent = computed(() =>
    this.percent(this.result()?.score ?? 0),
  );

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;

    // Release the previous object URL first. Picking several files in a row
    // without clearing would otherwise leak one blob per pick.
    this.releasePreview();

    this.reset();
    this.file.set(selected);
    if (selected) {
      this.previewUrl.set(URL.createObjectURL(selected));
    }
  }

  protected submit(): void {
    const selected = this.file();
    if (!selected || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.ambiguous.set(null);

    this.api.analyze(selected, this.chosenCategory()).subscribe({
      next: (analysis) => {
        this.result.set(analysis);
        this.busy.set(false);
      },
      error: (failure: Error) => {
        this.busy.set(false);
        if (failure instanceof AmbiguousCategoryError) {
          this.ambiguous.set(failure.info);
        } else {
          this.error.set(failure.message);
        }
      },
    });
  }

  protected chooseAndRetry(category: string): void {
    this.chosenCategory.set(category);
    this.submit();
  }

  protected clear(): void {
    this.releasePreview();
    this.file.set(null);
    this.reset();
  }

  private releasePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }

  protected percent(value: number): number {
    return Math.round(value * 100);
  }

  private reset(): void {
    this.result.set(null);
    this.error.set(null);
    this.ambiguous.set(null);
    this.chosenCategory.set(null);
  }
}
