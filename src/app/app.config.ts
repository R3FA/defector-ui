import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // withFetch() is not passed: FetchBackend is the default from v21 and the
    // option is deprecated. Upload progress would need withXhr(), which this
    // app does not require.
    provideHttpClient(),
  ],
};
