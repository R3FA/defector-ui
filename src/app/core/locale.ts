import { registerLocaleData } from '@angular/common';
import localeBs from '@angular/common/locales/bs';
import { LOCALE_ID, Provider } from '@angular/core';

registerLocaleData(localeBs);

/** Bosnian number formats, as in the thesis: 0,50 and 90,2% rather than 0.50 and 90.2%. */
export const bosnianLocale: Provider = { provide: LOCALE_ID, useValue: 'bs' };
