import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAsk, buildReply, buildStatus, scanText, digest, formatDigest, unwrap, newCode, timeId } from '../bin/inbox.mjs';

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
