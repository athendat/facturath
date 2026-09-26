import { handleUsage, type CountsDatabase } from './usage-endpoint';

/**
 * The Worker in front of the static site (#76). `run_worker_first` in wrangler.jsonc sends only
 * `/api/*` here; every other path is served straight from the assets, as before.
 * Not part of the Angular app: tsconfig.app.json leaves this folder out and wrangler bundles it.
 */

interface Env {
  STATS: CountsDatabase;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/api/usage') {
      return handleUsage(request, env.STATS, new Date());
    }
    return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
  },
};
