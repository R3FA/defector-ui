import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { Analysis } from '../../core/models';
import { QcApi } from '../../core/qc-api';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-history',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History {
  private readonly api = inject(QcApi);

  protected readonly columns = [
    'created_at',
    'category',
    'verdict',
    'score',
    'area',
    'duration',
    'open',
  ];

  protected readonly categories = signal<string[]>([]);
  protected readonly categoryFilter = signal<string | null>(null);
  protected readonly defectiveFilter = signal<boolean | null>(null);
  protected readonly page = signal(0);

  protected readonly rows = signal<Analysis[]>([]);
  protected readonly total = signal(0);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<Analysis | null>(null);

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / PAGE_SIZE)),
  );

  constructor() {
    this.api.categories().subscribe({
      next: (info) => this.categories.set(info.categories.map((c) => c.name)),
      error: () => this.categories.set([]),
    });

    // Refetches whenever a filter or the page changes.
    effect(() => {
      const category = this.categoryFilter();
      const defective = this.defectiveFilter();
      const page = this.page();

      this.busy.set(true);
      this.error.set(null);
      this.api
        .history({
          category,
          defective,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
        .subscribe({
          next: (result) => {
            this.rows.set(result.items);
            this.total.set(result.total);
            this.busy.set(false);
          },
          error: (failure: Error) => {
            this.error.set(failure.message);
            this.rows.set([]);
            this.busy.set(false);
          },
        });
    });
  }

  protected setCategory(value: string | null): void {
    this.categoryFilter.set(value);
    this.page.set(0);
  }

  protected setDefective(value: boolean | null): void {
    this.defectiveFilter.set(value);
    this.page.set(0);
  }

  protected step(delta: number): void {
    this.page.update((current) =>
      Math.min(Math.max(0, current + delta), this.pageCount() - 1),
    );
  }

  protected open(row: Analysis): void {
    this.selected.set(this.selected()?.id === row.id ? null : row);
  }

  /** Zero pixels above the pixel threshold means the verdict is not localised. */
  protected localised(row: Analysis): boolean {
    return row.defect_area_px > 0;
  }
}
