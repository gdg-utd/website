// Loaded only by the test build/server, never by the deployed application.
const originalFetch = global.fetch;
global.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'gdg.community.dev') {
    const data = {props:{pageProps:{chapterData:{chapter_location:'Richardson, TX',members_count:100},prerenderData:{upcomingEvents:{results:[]},chapterTeam:[]}}}};
    return new Response(`<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>`, {headers:{'content-type':'text/html'}});
  }
  if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)) {
    throw new Error(`Browser test blocked external fetch: ${url.origin}`);
  }
  return originalFetch(input, options);
};
