import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAsk, buildReply, buildStatus, buildEdit, scanText, digest, formatDigest, isOverdue, statusWord, unwrap, newCode, timeId, TEMPLATES, KINDS, pageVersion, compareVersions, pageUpdate, PAGE_FILE } from '../bin/inbox.mjs';

const CLI = fileURLToPath(new URL('../bin/inbox.mjs', import.meta.url));
const MIKUL = 'u_mikul0000000000000000a';
const PRIYA = 'u_priya0000000000000000b';
const ALEX = 'u_alex00000000000000000c';
const NOW = '2026-11-17T14:32:00.000Z';

const draft = (over = {}) => ({
  to: [PRIYA],
  kind: 'blocker',
  title: 'Hero banner: Figma shows 3 CTAs on mobile, tokens define 2 button variants',
  body: 'Which wins on mobile?',
  project: 'storefront',
  links: ['https://www.figma.com/design/abc?node-id=12-34'],
  context: { repo: 'acme-storefront', branch: 'feat/hero-banner', files: ['src/components/HeroBanner.tsx'] },
  ...over,
});

test('codes and time ids use the unambiguous alphabet and are path-safe', () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^[A-HJ-NP-Z2-9]{6}$/);
  assert.match(timeId(NOW), /^20261117T143200000Z-[A-HJ-NP-Z2-9]{4}$/);
});

test('buildAsk produces an open ask with participants and a created event', () => {
  const { ask, event } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  assert.equal(ask.status, 'open');
  assert.deepEqual(ask.toIds, [PRIYA]);
  assert.deepEqual(ask.participants, [MIKUL, PRIYA]);
  assert.equal(ask.lastActivityBy, MIKUL);
  assert.equal(event.type, 'created');
});

test('buildAsk rejects missing recipients, bad kinds, long titles, bad links and self-only asks', () => {
  assert.throws(() => buildAsk(draft({ to: [] }), MIKUL, NOW), /at least one person or a group/);
  assert.throws(() => buildAsk(draft({ kind: 'urgent' }), MIKUL, NOW), /kind must be one of/);
  assert.throws(() => buildAsk(draft({ title: 'x'.repeat(121) }), MIKUL, NOW), /limit is 120/);
  assert.throws(() => buildAsk(draft({ links: ['javascript:alert(1)'] }), MIKUL, NOW), /must start with http/);
  assert.throws(() => buildAsk(draft({ to: [MIKUL] }), MIKUL, NOW), /yourself/);
  assert.throws(() => buildAsk(draft(), '', NOW), /member id/);
});

test('buildAsk to a group only is allowed', () => {
  const { ask } = buildAsk(draft({ to: [], group: 'Design' }), MIKUL, NOW);
  assert.equal(ask.toGroup, 'design');
  assert.deepEqual(ask.toIds, []);
});

test('secret scan blocks keys and passwords and masks what it shows', () => {
  const key = 'sk-ant-api03-' + 'a'.repeat(40);
  const hits = scanText(`here is the key ${key}`);
  assert.equal(hits[0].label, 'Anthropic key');
  assert.ok(!hits[0].sample.includes('a'.repeat(10)), 'sample must be masked');
  assert.equal(scanText('password = hunter2hunter2').length, 1);
  assert.equal(scanText('postgres://admin:s3cretpw@db.internal:5432/app').length, 1);
  assert.equal(scanText('Keep 2 CTAs; the third becomes a text link.').length, 0);
  assert.throws(() => buildAsk(draft({ body: `token: ghp_${'x'.repeat(36)}` }), MIKUL, NOW), /contains a secret/);
});

test('a reply from the assignee answers the ask; a follow-up from the asker reopens it', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  const r1 = buildReply(ask, { body: 'Keep 2; the third CTA becomes a text link on mobile.' }, PRIYA, '2026-11-18T09:00:00.000Z');
  assert.equal(r1.patch.status, 'answered');
  assert.equal(r1.patch.firstAnswerAt, '2026-11-18T09:00:00.000Z');
  assert.equal(r1.event.type, 'answered');
  const answered = { ...ask, ...r1.patch };
  const r2 = buildReply(answered, { body: 'Does the text link keep the arrow icon?' }, MIKUL, '2026-11-18T10:00:00.000Z');
  assert.equal(r2.patch.status, 'open');
  assert.equal(r2.event.type, 'reopened');
  assert.equal(r2.patch.firstAnswerAt, undefined, 'first answer time is kept, not overwritten');
});

test('replies to closed asks and secret replies are refused', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  assert.throws(() => buildReply({ ...ask, status: 'resolved' }, { body: 'late' }, PRIYA), /reopen it/);
  assert.throws(() => buildReply(ask, { body: '-----BEGIN RSA PRIVATE KEY-----' }, PRIYA), /secret/);
  assert.throws(() => buildReply(ask, { body: '   ' }, PRIYA), /required/);
});

test('status actions: claim, accept, reopen, cancel, reassign', () => {
  const { ask } = buildAsk(draft({ to: [], group: 'design' }), MIKUL, NOW, 'K3F9X2');
  const claim = buildStatus(ask, 'claim', PRIYA, {}, NOW);
  assert.equal(claim.patch.status, 'claimed');
  assert.deepEqual(claim.patch.toIds, [PRIYA]);
  assert.throws(() => buildStatus({ ...ask, status: 'claimed' }, 'claim', ALEX), /Only an open ask/);

  const reply = { askCode: 'K3F9X2', authorId: PRIYA, body: 'Keep 2.' };
  const acc = buildStatus({ ...ask, status: 'answered' }, 'accept', MIKUL, { reply, replyId: 'r1' }, NOW);
  assert.equal(acc.patch.status, 'resolved');
  assert.deepEqual(acc.patch.answer, { replyId: 'r1', authorId: PRIYA, body: 'Keep 2.' });
  assert.throws(() => buildStatus(ask, 'accept', MIKUL, { reply: { ...reply, askCode: 'OTHER1' }, replyId: 'r1' }), /from this ask/);

  assert.equal(buildStatus({ ...ask, status: 'resolved' }, 'reopen', ALEX, {}, NOW).patch.answer, null);
  assert.throws(() => buildStatus(ask, 'reopen', ALEX), /nothing to reopen/);
  assert.equal(buildStatus(ask, 'cancel', MIKUL, {}, NOW).patch.status, 'cancelled');
  const re = buildStatus({ ...ask, status: 'claimed', claimedBy: PRIYA }, 'reassign', MIKUL, { to: [ALEX] }, NOW);
  assert.deepEqual([re.patch.status, re.patch.claimedBy, re.patch.toIds], ['open', null, [ALEX]]);
  assert.throws(() => buildStatus(ask, 'archive', MIKUL), /Unknown action/);
});

test('digest: blockers first, group asks for members, snoozes hidden, unseen replies only', () => {
  const now = new Date('2026-11-18T08:00:00.000Z');
  const base = { status: 'open', toIds: [], participants: [], createdAt: '2026-11-17T08:00:00.000Z', lastActivityAt: '2026-11-17T08:00:00.000Z' };
  const asks = [
    { ...base, code: 'Q1', kind: 'question', title: 'Venue timezone?', fromId: ALEX, toIds: [PRIYA], createdAt: '2026-11-16T08:00:00.000Z' },
    { ...base, code: 'B1', kind: 'blocker', title: 'Hero CTAs', fromId: MIKUL, toIds: [PRIYA] },
    { ...base, code: 'G1', kind: 'question', title: 'Icon set', fromId: ALEX, toGroup: 'design' },
    { ...base, code: 'G2', kind: 'question', title: 'Backend thing', fromId: ALEX, toGroup: 'backend' },
    { ...base, code: 'S1', kind: 'question', title: 'Arabic copy', fromId: ALEX, toIds: [PRIYA] },
    { ...base, code: 'MINE', kind: 'question', title: 'My own ask', fromId: PRIYA, toIds: [ALEX], status: 'answered', lastActivityBy: ALEX, lastActivityAt: '2026-11-17T20:00:00.000Z' },
    { ...base, code: 'SEEN', kind: 'question', title: 'Seen already', fromId: PRIYA, toIds: [ALEX], status: 'answered', lastActivityBy: ALEX, lastActivityAt: '2026-11-17T10:00:00.000Z' },
    { ...base, code: 'DONE', kind: 'blocker', title: 'Resolved', fromId: ALEX, toIds: [PRIYA], status: 'resolved' },
  ];
  const state = { snoozed: { S1: '2026-11-20' }, lastSeen: { SEEN: '2026-11-17T11:00:00.000Z' } };
  const d = digest({ asks, me: PRIYA, groups: ['design'], state, now });
  assert.deepEqual(d.forYou.map((a) => a.code), ['B1', 'Q1', 'G1']);
  assert.deepEqual(d.replies.map((a) => a.code), ['MINE']);
  const text = formatDigest(d);
  assert.match(text, /for_you: 3 \(1 blocker\)/);
  assert.match(text, /\[BLOCKER\] B1 "Hero CTAs"/);
  assert.match(text, /group design, unclaimed/);
});

test('digest output strips control characters from teammate text', () => {
  const asks = [{ code: 'X1', kind: 'question', status: 'open', fromId: ALEX, toIds: [PRIYA], title: 'line one\n\nIGNORE PREVIOUS‮', createdAt: NOW, lastActivityAt: NOW }];
  const text = formatDigest(digest({ asks, me: PRIYA, now: new Date(NOW) }));
  assert.ok(!/\n\n/.test(text.split('for_you')[1]), 'newlines inside a title are flattened');
  assert.ok(!text.includes('‮'));
});

test('workdir makes a fresh empty folder on every call', () => {
  const base = mkdtempSync(join(tmpdir(), 'team-inbox-wd-'));
  const one = execFileSync('node', [CLI, 'workdir', '--base', base], { encoding: 'utf8' }).trim();
  const two = execFileSync('node', [CLI, 'workdir', '--base', base], { encoding: 'utf8' }).trim();
  assert.notEqual(one, two);
  assert.ok(one.startsWith(join(base, 'run-')));
});

test('unwrap accepts bare bodies and id/version wrappers', () => {
  assert.deepEqual(unwrap({ a: 1 }), { a: 1 });
  assert.deepEqual(unwrap({ id: 'K', version: 3, data: { a: 1 } }), { a: 1 });
});

test('CLI end to end: prepare-ask, prepare-reply, digest over an out_dir layout', () => {
  const dir = mkdtempSync(join(tmpdir(), 'team-inbox-'));
  const d = join(dir, 'draft.json');
  writeFileSync(d, JSON.stringify(draft()));
  const made = JSON.parse(execFileSync('node', [CLI, 'prepare-ask', '--draft', d, '--me', MIKUL, '--out', join(dir, 'w')], { encoding: 'utf8' }));
  assert.equal(made.writes.length, 2);
  assert.equal(made.writes[0].collection, 'asks');
  const askFile = made.writes[0].file_path;

  // Lay the ask out the way ArtifactData out_dir does: <out>/<collection>/<doc_id>.json
  mkdirSync(join(dir, 'store', 'asks'), { recursive: true });
  writeFileSync(join(dir, 'store', 'asks', `${made.code}.json`), JSON.stringify({ id: made.code, version: 1, data: JSON.parse(readFileSync(askFile, 'utf8')) }));
  mkdirSync(join(dir, 'store', 'members'), { recursive: true });
  writeFileSync(join(dir, 'store', 'members', `${PRIYA}.json`), JSON.stringify({ groups: ['design'] }));
  const dig = execFileSync('node', [CLI, 'digest', '--dir', join(dir, 'store'), '--me', PRIYA], { encoding: 'utf8' });
  assert.match(dig, /for_you: 1 \(1 blocker\)/);

  const r = join(dir, 'reply.json');
  writeFileSync(r, JSON.stringify({ body: 'Keep 2.' }));
  const rep = JSON.parse(execFileSync('node', [CLI, 'prepare-reply', '--ask', join(dir, 'store', 'asks', `${made.code}.json`), '--draft', r, '--me', PRIYA, '--out', join(dir, 'w')], { encoding: 'utf8' }));
  assert.equal(rep.statusAfter, 'answered');
  assert.equal(rep.writes.length, 3);

  const bad = spawnSync('node', [CLI, 'prepare-ask', '--draft', d, '--out', join(dir, 'w')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /member id/);
});

// ---------------------------------------------------------------- v1.1: nudge, follow, edit, templates, escalation

test('a new ask starts with no followers and no nudges', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  assert.deepEqual([ask.followers, ask.nudgedAt, ask.nudges], [[], null, 0]);
});

test('nudge: asker or follower only, active asks only, with a cooldown', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  const n1 = buildStatus(ask, 'nudge', MIKUL, {}, '2026-11-18T09:00:00.000Z');
  assert.deepEqual([n1.patch.nudgedAt, n1.patch.nudgedBy, n1.patch.nudges, n1.event.type], ['2026-11-18T09:00:00.000Z', MIKUL, 1, 'nudged']);
  assert.equal(n1.patch.lastActivityBy, MIKUL, 'a nudge is activity, so the assignee sees it as new');
  const nudged = { ...ask, ...n1.patch };
  assert.throws(() => buildStatus(nudged, 'nudge', MIKUL, {}, '2026-11-18T10:00:00.000Z'), /at least 4 hours/);
  assert.equal(buildStatus(nudged, 'nudge', MIKUL, {}, '2026-11-18T14:00:00.000Z').patch.nudges, 2);
  assert.throws(() => buildStatus(ask, 'nudge', ALEX, {}, NOW), /asker or someone following/);
  assert.equal(buildStatus({ ...ask, followers: [ALEX] }, 'nudge', ALEX, {}, NOW).patch.nudgedBy, ALEX);
  assert.throws(() => buildStatus({ ...ask, status: 'answered' }, 'nudge', MIKUL, {}, NOW), /open or claimed/);
});

test('follow and unfollow change followers without counting as activity', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  const f = buildStatus(ask, 'follow', ALEX, {}, NOW);
  assert.deepEqual(f.patch.followers, [ALEX]);
  assert.equal(f.patch.lastActivityAt, undefined);
  assert.equal(f.event.type, 'followed');
  const followed = { ...ask, ...f.patch };
  assert.throws(() => buildStatus(followed, 'follow', ALEX, {}, NOW), /already follow/);
  assert.throws(() => buildStatus(ask, 'follow', MIKUL, {}, NOW), /already get its updates/);
  assert.deepEqual(buildStatus(followed, 'unfollow', ALEX, {}, NOW).patch.followers, []);
  assert.throws(() => buildStatus(ask, 'unfollow', ALEX, {}, NOW), /do not follow/);
});

test('edit: asker only, changed fields only, recipients refused, secrets refused', () => {
  const { ask } = buildAsk(draft(), MIKUL, NOW, 'K3F9X2');
  const e = buildEdit(ask, { title: ask.title, body: 'Which wins on mobile? Tokens are in v2.3.', neededBy: '2026-11-20' }, MIKUL, '2026-11-18T09:00:00.000Z');
  assert.deepEqual(Object.keys(e.patch).sort(), ['body', 'editedAt', 'lastActivityAt', 'lastActivityBy', 'neededBy', 'updatedAt']);
  assert.equal(e.event.type, 'edited');
  assert.equal(e.event.detail, 'body, neededBy');
  assert.throws(() => buildEdit(ask, { title: 'Mine now' }, PRIYA), /Only the person who raised/);
  assert.throws(() => buildEdit(ask, { title: ask.title }, MIKUL), /Nothing changed/);
  assert.throws(() => buildEdit(ask, { to: [ALEX] }, MIKUL), /reassign/);
  assert.throws(() => buildEdit({ ...ask, status: 'resolved' }, { body: 'x' }, MIKUL), /reopen it/);
  assert.throws(() => buildEdit(ask, { body: `key sk-ant-api03-${'b'.repeat(40)}` }, MIKUL), /secret/);
  assert.throws(() => buildEdit(ask, { kind: 'urgent' }, MIKUL), /kind must be one of/);
  assert.equal(buildEdit(ask, { neededBy: null, kind: 'question' }, MIKUL).event.detail, 'kind');
});

test('every kind has a template with headings ending in a colon', () => {
  for (const k of KINDS) assert.match(TEMPLATES[k], /^[^\n]+:\n\n[^\n]+:\n\n[^\n]+:$/);
});

test('overdue: past needed-by, or a blocker older than blockerHours', () => {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const a = { status: 'open', kind: 'blocker', createdAt: '2026-11-17T10:00:00.000Z' };
  assert.equal(isOverdue(a, now, 24), true);
  assert.equal(isOverdue(a, now, 48), false);
  assert.equal(isOverdue({ ...a, kind: 'question' }, now, 24), false);
  assert.equal(isOverdue({ ...a, kind: 'question', neededBy: '2026-11-17' }, now, 24), true);
  assert.equal(isOverdue({ ...a, status: 'answered' }, now, 24), false);
});

test('digest: overdue and nudged asks come first, nudges cut through snoozes, followers get updates', () => {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const base = { status: 'open', kind: 'question', toIds: [PRIYA], participants: [], followers: [], createdAt: '2026-11-18T08:00:00.000Z', lastActivityAt: '2026-11-18T08:00:00.000Z', lastActivityBy: ALEX };
  const asks = [
    { ...base, code: 'NEWB', kind: 'blocker', title: 'Fresh blocker', fromId: ALEX },
    { ...base, code: 'OLDB', kind: 'blocker', title: 'Old blocker', fromId: ALEX, createdAt: '2026-11-16T08:00:00.000Z' },
    { ...base, code: 'NUDG', title: 'Snoozed but nudged', fromId: ALEX, nudgedAt: '2026-11-18T11:00:00.000Z', nudgedBy: ALEX, nudges: 2 },
    { ...base, code: 'FOLW', title: 'Followed and answered', fromId: ALEX, toIds: [MIKUL], status: 'resolved', followers: [PRIYA], lastActivityBy: MIKUL, lastActivityAt: '2026-11-18T10:00:00.000Z' },
    { ...base, code: 'SEEN', title: 'Followed, already seen', fromId: ALEX, toIds: [MIKUL], status: 'answered', followers: [PRIYA], lastActivityBy: MIKUL, lastActivityAt: '2026-11-18T09:00:00.000Z' },
    { ...base, code: 'WAIT', kind: 'blocker', title: 'My old blocker', fromId: PRIYA, toIds: [ALEX], createdAt: '2026-11-16T08:00:00.000Z', lastActivityBy: PRIYA },
  ];
  const state = { snoozed: { NUDG: '2026-11-25' }, lastSeen: { NUDG: '2026-11-18T09:00:00.000Z', SEEN: '2026-11-18T09:30:00.000Z' } };
  const d = digest({ asks, me: PRIYA, groups: [], state, blockerHours: 24, now });
  assert.deepEqual(d.forYou.map((a) => a.code), ['OLDB', 'NUDG', 'NEWB']);
  assert.deepEqual(d.following.map((a) => a.code), ['FOLW']);
  assert.deepEqual(d.flags.NUDG, ['NUDGED x2']);
  const text = formatDigest(d);
  assert.match(text, /for_you: 3 \(2 blocker, 1 overdue, 1 nudged\)/);
  assert.match(text, /\[BLOCKER\] \[OVERDUE\] OLDB/);
  assert.match(text, /\[NUDGED x2\] NUDG/);
  assert.match(text, /following_updates: 1\n  FOLW "Followed and answered" resolved by/);
  assert.match(text, /waiting_on_others: 1 \(1 overdue\)\n  \[OVERDUE\] WAIT "My old blocker" waiting 2d, never nudged/);
  // Your own nudge is not news to you.
  const own = digest({ asks: [{ ...asks[2], nudgedBy: PRIYA }], me: PRIYA, state, now });
  assert.deepEqual(own.forYou.map((a) => a.code), [], 'still snoozed, because the nudge was your own');
});

test('CLI: prepare-edit, nudge through prepare-status, template, and digest reads blockerHours from config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'team-inbox-v11-'));
  const { ask } = buildAsk(draft({ kind: 'question' }), MIKUL, NOW, 'K3F9X2');
  const askFile = join(dir, 'ask.json');
  writeFileSync(askFile, JSON.stringify({ id: 'K3F9X2', version: 4, data: ask }));
  writeFileSync(join(dir, 'edit.json'), JSON.stringify({ title: 'Hero banner: which CTA set wins on mobile?' }));
  const ed = JSON.parse(execFileSync('node', [CLI, 'prepare-edit', '--ask', askFile, '--draft', join(dir, 'edit.json'), '--me', MIKUL, '--out', join(dir, 'w')], { encoding: 'utf8' }));
  assert.equal(ed.changed, 'title');
  assert.match(ed.writes[0].if_version, /^PIN/);
  const nu = JSON.parse(execFileSync('node', [CLI, 'prepare-status', '--ask', askFile, '--action', 'nudge', '--me', MIKUL, '--out', join(dir, 'w')], { encoding: 'utf8' }));
  assert.equal(nu.statusAfter, 'open', 'status is reported even when the action does not change it');
  assert.equal(execFileSync('node', [CLI, 'template', '--kind', 'blocker'], { encoding: 'utf8' }).trim(), TEMPLATES.blocker);
  const bad = spawnSync('node', [CLI, 'prepare-edit', '--ask', askFile, '--draft', join(dir, 'edit.json'), '--me', PRIYA, '--out', join(dir, 'w')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);

  const store = join(dir, 'store');
  mkdirSync(join(store, 'asks'), { recursive: true });
  mkdirSync(join(store, 'config'), { recursive: true });
  const old = { ...ask, kind: 'blocker', createdAt: new Date(Date.now() - 30 * 3_600_000).toISOString() };
  writeFileSync(join(store, 'asks', 'K3F9X2.json'), JSON.stringify(old));
  writeFileSync(join(store, 'config', 'app.json'), JSON.stringify({ blockerHours: 48 }));
  const calm = execFileSync('node', [CLI, 'digest', '--dir', store, '--me', PRIYA, '--groups', ''], { encoding: 'utf8' });
  assert.doesNotMatch(calm, /OVERDUE/, '30h is not overdue when the inbox allows 48h');
  const strict = execFileSync('node', [CLI, 'digest', '--dir', store, '--me', PRIYA, '--groups', '', '--blocker-hours', '24'], { encoding: 'utf8' });
  assert.match(strict, /\[BLOCKER\] \[OVERDUE\] K3F9X2/);
});

// ---------------------------------------------------------------- v1.2: to-dos

const todoDraft = (over = {}) => draft({ kind: 'todo', title: 'Update the hero tokens to v2.3', body: 'What to do: bump tokens\n\nDone when: hero uses v2.3', neededBy: '2026-11-20', ...over });

test('a to-do is an ask of kind todo, with a template and an optional link to the ask it came from', () => {
  const { ask } = buildAsk(todoDraft({ fromAsk: 'k3f9x2' }), MIKUL, NOW, 'TD1234');
  assert.deepEqual([ask.kind, ask.status, ask.fromAsk, ask.done, ask.declined], ['todo', 'open', 'K3F9X2', null, null]);
  assert.match(TEMPLATES.todo, /^What to do:/);
  assert.throws(() => buildAsk(draft({ fromAsk: 'K3F9X2' }), MIKUL, NOW), /only for a to-do/);
  assert.throws(() => buildAsk(todoDraft({ fromAsk: 'not a code!' }), MIKUL, NOW), /not an ask code/);
});

test('to-do lifecycle: start, done with a note, reopen; replies never change its status', () => {
  const { ask } = buildAsk(todoDraft(), MIKUL, NOW, 'TD1234');
  const r = buildReply(ask, { body: 'Which token file, the web one?' }, PRIYA, NOW);
  assert.equal(r.patch.status, undefined, 'a reply is conversation, not completion');
  assert.equal(r.event, null);
  const s = buildStatus(ask, 'start', PRIYA, {}, NOW);
  assert.deepEqual([s.patch.status, s.patch.claimedBy, s.event.type], ['claimed', PRIYA, 'started']);
  const doing = { ...ask, ...s.patch };
  assert.throws(() => buildStatus(doing, 'start', PRIYA, {}, NOW), /already in progress/);
  const d = buildStatus(doing, 'done', PRIYA, { note: 'Tokens bumped in PR 512.' }, NOW);
  assert.equal(d.patch.status, 'resolved');
  assert.deepEqual(d.patch.done, { by: PRIYA, note: 'Tokens bumped in PR 512.', at: NOW });
  assert.equal(d.patch.answer, undefined, 'a done note is not an answer, so it stays out of the Answers library');
  const done = { ...doing, ...d.patch };
  assert.equal(statusWord(done), 'done');
  const re = buildStatus(done, 'reopen', MIKUL, {}, NOW);
  assert.deepEqual([re.patch.status, re.patch.done, re.patch.claimedBy], ['open', null, null]);
  assert.equal(buildStatus(ask, 'claim', PRIYA, {}, NOW).event.type, 'started', 'claiming a group to-do starts it');
});

test("can't do: needs a reason, not by the asker, reassign or reopen brings it back", () => {
  const { ask } = buildAsk(todoDraft(), MIKUL, NOW, 'TD1234');
  assert.throws(() => buildStatus(ask, 'decline', PRIYA, {}, NOW), /reason is required/);
  assert.throws(() => buildStatus(ask, 'decline', MIKUL, { reason: 'busy' }, NOW), /cancel it instead/);
  const dec = buildStatus(ask, 'decline', PRIYA, { reason: 'Design owns the tokens, not frontend.' }, NOW);
  assert.deepEqual([dec.patch.status, dec.patch.declined.reason, dec.event.type], ['declined', 'Design owns the tokens, not frontend.', 'declined']);
  const declined = { ...ask, ...dec.patch };
  assert.equal(statusWord(declined), "can't do");
  assert.throws(() => buildReply(declined, { body: 'hm' }, MIKUL), /reopen it/);
  const moved = buildStatus(declined, 'reassign', MIKUL, { to: [ALEX] }, NOW);
  assert.deepEqual([moved.patch.status, moved.patch.declined], ['open', null]);
  assert.equal(buildStatus(declined, 'reopen', MIKUL, {}, NOW).patch.status, 'open');
  assert.throws(() => buildStatus(ask, 'decline', PRIYA, { reason: `pwd: ${'x'.repeat(4)} password = hunter2hunter2` }, NOW), /secret/);
});

test('to-do actions are refused on questions, and accept is refused on to-dos', () => {
  const { ask: q } = buildAsk(draft({ kind: 'question' }), MIKUL, NOW, 'Q12345');
  for (const a of ['start', 'done']) assert.throws(() => buildStatus(q, a, PRIYA, {}, NOW), /not a to-do/);
  assert.throws(() => buildStatus(q, 'decline', PRIYA, { reason: 'x' }, NOW), /not a to-do/);
  const { ask: t } = buildAsk(todoDraft(), MIKUL, NOW, 'TD1234');
  assert.throws(() => buildStatus(t, 'accept', MIKUL, { reply: { askCode: 'TD1234', body: 'x' }, replyId: 'r1' }, NOW), /mark it done/);
});

test('digest counts to-dos, flags due today and doing, and words done and can\'t do plainly', () => {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const base = { kind: 'todo', status: 'open', toIds: [PRIYA], participants: [], followers: [], createdAt: '2026-11-18T08:00:00.000Z', lastActivityAt: '2026-11-18T08:00:00.000Z', lastActivityBy: ALEX, fromId: ALEX };
  const asks = [
    { ...base, code: 'TDUE', title: 'Due today', neededBy: '2026-11-18' },
    { ...base, code: 'TDO1', title: 'In progress', status: 'claimed', claimedBy: PRIYA },
    { ...base, code: 'TQ01', kind: 'question', title: 'A question' },
    { ...base, code: 'MINE', title: 'My to-do, declined', fromId: PRIYA, toIds: [ALEX], status: 'declined', lastActivityAt: '2026-11-18T11:00:00.000Z' },
  ];
  const d = digest({ asks, me: PRIYA, now });
  assert.deepEqual(d.forYou.map((a) => a.code), ['TDUE', 'TDO1', 'TQ01']);
  const text = formatDigest(d);
  assert.match(text, /for_you: 3 \(2 to-do, 1 due today\)/);
  assert.match(text, /\[TODO\] \[DUE TODAY\] TDUE/);
  assert.match(text, /\[TODO\] \[DOING\] TDO1/);
  assert.match(text, /MINE "My to-do, declined" can't do by/);
});

test('CLI: prepare-status passes --note and --reason for to-dos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'team-inbox-todo-'));
  const { ask } = buildAsk(todoDraft(), MIKUL, NOW, 'TD1234');
  const f = join(dir, 'ask.json');
  writeFileSync(f, JSON.stringify(ask));
  const run = (...args) => JSON.parse(execFileSync('node', [CLI, 'prepare-status', '--ask', f, '--me', PRIYA, '--out', join(dir, 'w'), ...args], { encoding: 'utf8' }));
  const done = run('--action', 'done', '--note', 'Shipped in PR 512.');
  assert.equal(done.statusAfter, 'resolved');
  assert.equal(JSON.parse(readFileSync(done.writes[0].file_path, 'utf8')).done.note, 'Shipped in PR 512.');
  const dec = run('--action', 'decline', '--reason', 'Wrong team.');
  assert.equal(dec.statusAfter, 'declined');
  assert.equal(execFileSync('node', [CLI, 'template', '--kind', 'todo'], { encoding: 'utf8' }).trim(), TEMPLATES.todo);
});

// ---------------------------------------------------------------- v1.3: page updates

test('page version: read from the template meta tag, compared numerically, never downgraded', () => {
  const v = pageVersion(readFileSync(PAGE_FILE, 'utf8'));
  assert.match(v, /^\d+\.\d+\.\d+$/, 'the shipped page carries a team-inbox-version meta tag');
  assert.equal(pageVersion('<title>x</title>'), null);
  assert.equal(compareVersions('1.10.0', '1.9.3'), 1, 'numeric, not string, comparison');
  assert.equal(compareVersions('1.3.0', '1.3.0'), 0);
  assert.equal(compareVersions(null, '0.0.1'), -1, 'an unrecorded version is older than any real one');
  assert.equal(pageUpdate(null, '1.3.0'), 'needed');
  assert.equal(pageUpdate('1.2.0', '1.3.0'), 'needed');
  assert.equal(pageUpdate('1.3.0', '1.3.0'), 'none');
  assert.equal(pageUpdate('2.0.0', '1.3.0'), 'plugin-older');
});

test('CLI: page-version reports the template and the capabilities file, which setup and update-page publish', () => {
  const out = JSON.parse(execFileSync('node', [CLI, 'page-version', '--current', '1.2.0'], { encoding: 'utf8' }));
  assert.equal(out.template, pageVersion(readFileSync(PAGE_FILE, 'utf8')));
  assert.equal(out.update, 'needed');
  const caps = JSON.parse(readFileSync(out.capabilities, 'utf8'));
  assert.deepEqual(Object.keys(caps).sort(), ['assets', 'db', 'downloads', 'user']);
  assert.ok(caps.db.rules.some((r) => r.path === 'members/{self}' && r.write === 'interact'), 'members can write their own row');
  assert.ok(caps.db.rules.some((r) => r.path === 'config' && r.write === 'admin'), 'only owners and editors change settings');
  assert.equal(JSON.parse(execFileSync('node', [CLI, 'page-version'], { encoding: 'utf8' })).update, 'needed');
});

test('digest: page_update appears when config/app records an older or no page version, and only then', () => {
  const store = mkdtempSync(join(tmpdir(), 'team-inbox-v13-'));
  const template = pageVersion(readFileSync(PAGE_FILE, 'utf8'));
  const run = () => execFileSync('node', [CLI, 'digest', '--dir', store, '--me', PRIYA, '--groups', ''], { encoding: 'utf8' });
  assert.doesNotMatch(run(), /page_update/, 'no config read, nothing to compare');
  mkdirSync(join(store, 'config'));
  writeFileSync(join(store, 'config', 'app.json'), JSON.stringify({ id: 'app', version: 3, data: { blockerHours: 24 } }));
  assert.ok(run().includes(`page_update: the inbox page is unrecorded, this plugin has ${template};`), 'a store from before 1.3.0 is told to update');
  writeFileSync(join(store, 'config', 'app.json'), JSON.stringify({ pageVersion: template }));
  assert.doesNotMatch(run(), /page_update/);
  writeFileSync(join(store, 'config', 'app.json'), JSON.stringify({ pageVersion: '99.0.0' }));
  assert.doesNotMatch(run(), /page_update/, 'a newer page is not something a member can fix');
});
