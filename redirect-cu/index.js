// Deploy with: npx wrangler deploy -c redirect-cu/wrangler.jsonc
const TARGET = 'https://facturath.athendat.site';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(TARGET + url.pathname + url.search, 301);
  },
};
