import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Analiza',
    loadComponent: () =>
      import('./features/analyze/analyze').then((m) => m.Analyze),
  },
  {
    path: 'historija',
    title: 'Historija analiza',
    loadComponent: () =>
      import('./features/history/history').then((m) => m.History),
  },
  {
    path: 'metrike',
    title: 'Preciznost modela',
    loadComponent: () =>
      import('./features/metrics/metrics').then((m) => m.Metrics),
  },
  { path: '**', redirectTo: '' },
];
