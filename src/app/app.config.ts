import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';

/**
 * No Router: the app has a single URL and every secondary view (saved
 * invoices, settings, compliance) is a panel over the editor. Leaving the
 * Router out keeps about 84 kB out of the initial bundle.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideClientHydration()],
};
