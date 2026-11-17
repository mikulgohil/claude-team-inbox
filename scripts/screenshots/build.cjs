// Builds demo.html: the real inbox page with a mocked window.claude and fictional demo data, for README screenshots.
// Usage: node build.cjs <path to team-inbox.html> <out dir>
const fs = require('fs');
const [page, out] = [fs.readFileSync(process.argv[2], 'utf8'), process.argv[3]];

const mock = String.raw`<script>
(() => {
const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme');
const av = (t, c) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="' + c + '"/><text x="20" y="25.5" font-size="14" font-weight="600" font-family="Helvetica,Arial,sans-serif" fill="#fff" text-anchor="middle">' + t + '</text></svg>');
const P = {
  u_me: { id: 'u_me', name: 'Mikul Gohil', avatarUrl: av('MG', '#C46A4A') },
  u_pn: { id: 'u_pn', name: 'Priya Nair', avatarUrl: av('PN', '#5B7DB1') },
  u_tl: { id: 'u_tl', name: 'Tomas Lind', avatarUrl: av('TL', '#6E8B5A') },
  u_at: { id: 'u_at', name: 'Aiko Tanaka', avatarUrl: av('AT', '#9A6FB0') },
  u_lm: { id: 'u_lm', name: 'Leo Martins', avatarUrl: av('LM', '#B08A3E') },
};
const ago = (hrs) => new Date(Date.now() - hrs * 3600e3).toISOString();
const day = (d) => new Date(Date.now() + d * 86400e3).toLocaleDateString('en-CA');
const ask = (code, o) => ({ schema: 1, code, fromId: 'u_pn', toIds: ['u_me'], toGroup: null, kind: 'question', title: '', body: '', project: 'storefront', links: [], context: {}, neededBy: null, status: 'open', claimedBy: null, answer: null, participants: [], createdAt: ago(3), updatedAt: ago(3), lastActivityAt: ago(1), lastActivityBy: 'u_pn', demo: false, ...o });
const D = {
  'config/app': { name: 'Web platform team', inboxUrl: 'https://claude.ai/artifact/your-inbox-link', blockerHours: 24 },
  groups: { design: { name: 'Design' }, frontend: { name: 'Frontend' }, backend: { name: 'Backend' }, qa: { name: 'QA' }, pm: { name: 'Project management' } },
  members: {
    u_me: { groups: ['frontend'], availability: 'available' },
    u_pn: { groups: ['design'], availability: 'busy' },
    u_tl: { groups: ['backend'], availability: 'available' },
    u_at: { groups: ['qa'], availability: 'away', awayUntil: day(2) },
    u_lm: { groups: ['pm'], availability: 'available' },
  },
  asks: {
    QC7M4K: ask('QC7M4K', { kind: 'blocker', fromId: 'u_at', title: 'Checkout button disabled state fails contrast on Safari', body: 'QA sign-off for release 4.2 is blocked on this. Is the grey from the design tokens, or a Safari default?', neededBy: day(-1), createdAt: ago(20), lastActivityBy: 'u_at', context: { repo: 'acme-storefront', branch: 'release/4.2', files: ['src/components/CheckoutButton.tsx'] } }),
    PR2B8N: ask('PR2B8N', { fromId: 'u_lm', toIds: [], toGroup: 'frontend', title: 'Can the promo banner ship behind a flag this sprint?', body: 'Marketing wants it live on Monday. If a flag is easy, we can turn it on once copy is approved.', createdAt: ago(5), lastActivityBy: 'u_lm' }),
    RV5D3H: ask('RV5D3H', { kind: 'review', fromId: 'u_tl', title: 'Review the product card props before I wire the API', status: 'claimed', claimedBy: 'u_me', createdAt: ago(28), lastActivityBy: 'u_tl', project: 'checkout-api' }),
    FY9K2W: ask('FY9K2W', { kind: 'fyi', fromId: 'u_tl', title: 'Staging deploys move to 6pm on Thursdays', createdAt: ago(76), lastActivityAt: ago(76), lastActivityBy: 'u_me' }),
    UT4E6Z: ask('UT4E6Z', { fromId: 'u_me', toIds: ['u_tl'], title: 'Does the events API return UTC or local time?', body: 'The listing page shows event times four hours off for visitors in Dubai. I need to know before I add a conversion.', status: 'answered', firstAnswerAt: ago(2), createdAt: ago(3), lastActivityBy: 'u_tl', project: 'checkout-api', links: ['https://example.com/jira/WEB-412'], context: { repo: 'acme-storefront', branch: 'fix/event-times', files: ['src/lib/events.ts', 'src/app/events/page.tsx'] } }),
    HB8C1X: ask('HB8C1X', { kind: 'blocker', fromId: 'u_me', toIds: [], toGroup: 'design', title: 'Hero banner: Figma shows 3 CTAs on mobile, tokens define 2 button variants', body: 'Which wins on mobile? The third CTA has no matching variant.', createdAt: ago(6), lastActivityBy: 'u_me', links: ['https://www.figma.com/design/example'] }),
    NV3B7Q: ask('NV3B7Q', { fromId: 'u_me', toIds: ['u_pn'], title: 'Which breakpoint does the nav collapse at?', status: 'resolved', resolvedAt: ago(30), firstAnswerAt: ago(40), createdAt: ago(44), answer: { authorId: 'u_pn', body: '1024px. Below that it becomes the drawer.' } }),
    LZ6P2M: ask('LZ6P2M', { fromId: 'u_at', toIds: [], toGroup: 'frontend', title: 'Do we lazy-load images below the fold on product pages?', status: 'resolved', resolvedAt: ago(70), firstAnswerAt: ago(80), createdAt: ago(90), answer: { authorId: 'u_me', body: 'Yes, everything after the first gallery image uses loading="lazy".' } }),
  },
  'asks/UT4E6Z/replies': {
    r1: { authorId: 'u_tl', body: 'UTC, always. The \x60startsAt\x60 field is ISO 8601 with a Z suffix, so convert on the client:\n\x60\x60\x60ts\nconst local = new Date(event.startsAt).toLocaleString();\n\x60\x60\x60\nThe same goes for \x60endsAt\x60.', createdAt: ago(2), source: 'claude-code' },
    r2: { authorId: 'u_me', body: 'Thanks. Is that also true for the recurring events endpoint?', createdAt: ago(1.6) },
    r3: { authorId: 'u_tl', body: 'Yes, same serializer. The contract is in https://example.com/docs/events', createdAt: ago(1.2) },
  },
  'asks/UT4E6Z/events': { e1: { actorId: 'u_me', type: 'created', at: ago(3) }, e2: { actorId: 'u_tl', type: 'answered', at: ago(2) } },
  'data/users/u_me/state': { lastSeen: { FY9K2W: ago(1) }, snoozed: {} },
};
if (q.get('join')) delete D.members.u_me;
const snap = (p) => { const i = p.lastIndexOf('/'); const v = D[p] ?? D[p.slice(0, i)]?.[p.slice(i + 1)]; return { exists: v != null, id: p.slice(i + 1), data: () => v }; };
const qsnap = (p) => ({ docs: Object.entries(D[p] ?? {}).map(([id, v]) => ({ id, data: () => v })), metadata: { fromCache: false } });
const doc = (p) => ({ onSnapshot(cb) { setTimeout(() => cb(snap(p)), 20); return () => {}; }, async get() { return snap(p); }, async set() {}, async update() {}, async delete() {} });
const col = (p) => { const c = { orderBy: () => c, limit: () => c, where: () => c, doc: (id) => doc(p + '/' + id), onSnapshot(cb) { setTimeout(() => cb(qsnap(p)), 20); return () => {}; }, async get() { return qsnap(p); } }; return c; };
const caps = {
  db: { doc, collection: col },
  user: { me: async () => ({ ...P.u_me, canEdit: true }), id: async () => 'u_me', can: async () => true, profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, P[i]])), search: async (s) => Object.values(P).filter((p) => p.name.toLowerCase().includes(String(s).toLowerCase())) },
  assets: { upload: async () => ({}) }, downloads: { save: async () => {} },
};
window.claude = { use: async (n) => caps[n] ?? null };
if (q.get("compose") || q.get("still")) { const st = document.createElement('style'); st.textContent = '*,*::before,*::after,dialog[open],dialog[open]::backdrop{animation:none!important;transition:none!important}'; document.head.append(st); }
if (q.get('compose')) setTimeout(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
  setTimeout(() => {
    const set = (sel, v, ev = 'input') => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event(ev, { bubbles: true })); };
    set('#c-group', 'backend', 'change');
    set('#c-title', 'Is the events API in UTC for recurring events too?');
    set('#c-body', 'Recurring events show the same four-hour shift as single events.');
    document.activeElement?.blur();
  }, 150);
}, 600);
})();
</script>`;

const head = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body>';
fs.writeFileSync(out + '/demo.html', head + mock + page + '</body></html>');

// Two phones side by side on the page's own ground, for the "phone and dark mode" screenshot.
fs.writeFileSync(out + '/phones.html', `<!doctype html><meta charset=utf8><style>
body{margin:0;background:#F0EEE6;display:flex;gap:48px;justify-content:center;align-items:center;height:100vh}
iframe{border:0;width:390px;height:780px;border-radius:36px;box-shadow:0 0 0 10px #141413,0 30px 60px rgba(20,20,19,.25);background:#fff}
</style><iframe src="demo.html?theme=light#for-me"></iframe><iframe src="demo.html?theme=dark#ask-UT4E6Z"></iframe>`);
console.log('built', out);
