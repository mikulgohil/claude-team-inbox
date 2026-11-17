# Team Inbox change log

Hand-written decisions and verification notes, newest first.

## 2026-11-17 (local, v1.2 to-dos)
- Summary: to-dos, as a new kind of ask, across the helper CLI, a new `/team-inbox:todo` skill, the protocol and the page. Spec: section v1.2.
- Files touched: `plugin/bin/inbox.mjs`, `plugin/test/inbox.test.mjs`, `plugin/reference/protocol.md`, `plugin/skills/todo/SKILL.md` (new), `plugin/skills/ask/SKILL.md`, `plugin/page/team-inbox.html`, `scripts/screenshots/build.cjs`, `docs/images/*.png`, `README.md`, the spec. The live page was republished.
- Decisions:
  - A kind, not a separate collection: it reuses every v1.1 mechanism and needs no new access rules. The new status `declined` and the fields `done`, `declined`, `fromAsk`, `startedAt` are the only data model additions; old asks read them as empty.
  - The done note is stored in `done`, never in `answer`, so finished to-dos stay out of Answers and Search (both filter by kind as well).
  - On a to-do, `claim` behaves as `start`, so the group-claim path keeps working.
  - Follow is hidden from the people an ask is assigned to (on every kind): they already get its updates.
  - The composer gives Kind its own row, since five kinds do not fit beside Group, and keeps Group and Needed by next to To.
- Verified:
  - `npm test`: 32 of 32, 6 new (to-do creation and fromAsk, start / done / reopen, can't do rules and secret scan, actions refused on the wrong kind, digest counts and flags, CLI flags).
  - In the interactive demo: For me with to-dos and Due today, Start (Doing, carry-on command), Mark done with a note (done box, Done list), Can't do (empty reason refused, reason shown), Make a to-do from an answered question, and the composer switching to New to-do. Phone width checked in a 390px frame: the five kinds fit on one row.
- Not verified: the `/team-inbox:todo` skill run by a real Claude Code session against the live inbox, including loading a to-do into the session's task list.
- Note for future screenshots: headless Chrome will not make a window narrower than about 500px, so a 390px `--window-size` crops the page. Check phone layouts inside a 390px iframe (as `phones.html` does).

## 2026-11-17 (local, Agent SDK research)
- Summary: research only, no code change. Question from the owner: what could Team Inbox add with the Claude Agent SDK?
- Finding that decides it: an unattended agent cannot reach the inbox store today.
  - Probe (Claude Code, headless `claude -p`, claude.ai login, `apiKeySource: none`): the session had 182 tools and no Artifact tools; a read of `config/app` failed with "ArtifactData tool not available". Interactive sessions do have the tools.
  - Docs (code.claude.com/docs/en/artifacts.md, as quoted by a research agent, not opened directly): Artifacts are "Off by default in the Agent SDK, the GitHub Action, and MCP-server contexts, when you run Claude Code with -p", and need a `/login` session, not an API key. How to turn them on in those contexts is not documented.
  - Docs (agent-sdk/overview, via the same agent): Anthropic does not allow third-party products, including Agent SDK agents, to offer claude.ai login unless approved; distributed SDK agents use an API key, which cannot reach Artifacts.
- Consequence: any always-on feature (auto-triage, scheduled escalation, lead digest, answer freshness, PR integration) needs either a store an unattended agent can reach, or a Claude surface that has the Artifact tools.
- Open question worth a short spike: Claude Code scheduled tasks (cloud, formerly routines) run as the creator's claude.ai account with connectors and can publish Artifacts; whether they can read and write an Artifact's database is not documented. Desktop scheduled tasks are also untested.

## 2026-11-17 (local, v1.1)
- Summary: v1.1 adds nudge and escalation, follow ("Me too"), editing your own ask, and templates per kind, across the page, the helper CLI, the protocol and the skills. Spec: `docs/product/team-inbox-product-spec.md`, section v1.1.
- Files touched: `plugin/bin/inbox.mjs`, `plugin/test/inbox.test.mjs`, `plugin/reference/protocol.md`, `plugin/skills/{ask,inbox,resolve}/SKILL.md`, `plugin/page/team-inbox.html`, `scripts/screenshots/build.cjs`, `docs/images/*.png`, `README.md`, the spec. The live page was republished.
- Decisions:
  - Follower notifications use a second session-check query, `followers array-contains <me>`, because the first query only returns open asks and a follower most wants to hear about the resolution. `array-contains` was checked against the live store before relying on it.
  - The nudge cooldown (4 hours) is enforced by the CLI and the page, not by the access rules, which cannot express it. The page and the CLI share the constant and the overdue rule; each file says so.
  - Follow and unfollow write only `followers` and `updatedAt`, never `lastActivity*`, so they do not create unread dots. Nudge and edit do bump activity, because the assignee should notice them.
  - Page writes to `followers` are not version-pinned (the page's db API has no pin), so two people pressing Me too in the same instant could lose one. Accepted for v1.1: rare, visible, and fixed by pressing again. Claude's writes are pinned.
  - Asks written before v1.1 have no `followers`, `nudgedAt` or `nudges`; every reader treats a missing field as empty, so no migration is needed.
  - Fixed along the way: a focus ring drew around the whole content area after every view change, because `main` takes focus for screen readers.
  - The screenshot demo's mock store now applies writes and re-renders, so the demo can be clicked through to test flows.
- Verified:
  - `npm test`: 26 of 26, including 8 new tests (nudge rules and cooldown, follow without activity, edit rules and secret scan, templates, overdue rule, digest ordering with snooze override and follower updates, CLI end to end with `blockerHours` from config).
  - In the interactive demo: Nudge (tag, disabled button, toast), Edit (prefill, "Nothing changed yet", Use template, Save, history), Me too (Following list, Following button, Waiting on others), the Guide's new rows, and the For me ordering.
- Not verified: the new protocol steps run by a real Claude Code session against the live inbox, and two accounts nudging and following each other.
- Follow-ups:
  - Inboxes created by `/team-inbox:setup` keep the page version they were published with. A way for team leads to update their page (for example `/team-inbox:update-page`) is needed before the next page release.

## 2026-11-17 (local, repo rename)
- Summary: the GitHub repo is renamed from `mikulgohil/team-inbox` to `mikulgohil/claude-team-inbox` at the owner's request. Install is now `claude plugin install team-inbox --marketplace mikulgohil/claude-team-inbox --config inbox=<link>`.
- Files touched: `README.md`, `plugin/.claude-plugin/plugin.json`, `plugin/page/team-inbox.html` (`MARKETPLACE`), `plugin/skills/setup/SKILL.md`, `docs/product/team-inbox-product-spec.md`, `docs/images/*.png`. The live page was republished.
- Decisions:
  - Only the repo name changes. The plugin name, the marketplace name (`team-inbox@team-inbox`) and the `/team-inbox:*` commands stay, so commands stay short and nothing already installed breaks.
  - GitHub redirects the old repo address; whether Claude Code's marketplace fetch follows it is not verified, so every command now uses the new name.

## 2026-11-17 (local, after first push)
- Summary: the signed-in user in the README screenshots is now the author, Mikul Gohil, at his request; teammates, team name and projects stay fictional.
- Files touched: `scripts/screenshots/build.cjs`, `scripts/screenshots/shoot.sh`, `docs/images/*.png`, `README.md`.
- Decisions: light screenshots now pass `theme=light` explicitly. Without it, headless Chrome follows the Mac's appearance, and a run in the evening produced dark "light" screenshots.

## 2026-11-17 (local, before first push)
- Summary: the public home is `mikulgohil/team-inbox`, not the `inbox-for-claude` organization, which the owner could not create. This supersedes the "later" entry below.
- Files touched: `README.md`, `plugin/.claude-plugin/plugin.json`, `plugin/page/team-inbox.html` (`MARKETPLACE`), `plugin/skills/setup/SKILL.md`, `docs/product/team-inbox-product-spec.md`, `docs/images/*.png` (regenerated, since the Team and join screens show the install command). The live page was republished.
- Decisions:
  - Repo name `team-inbox`, chosen by the owner, so the repo, plugin and command prefix all match: `claude plugin install team-inbox --marketplace mikulgohil/team-inbox`.
  - The repo can move to an organization later; GitHub redirects a transferred repo, but whether Claude Code's marketplace fetch follows that redirect is not verified.
  - Before the first push, local history was rewritten with `git filter-repo --replace-text` so no commit contains the client project name, the employer's name or the live inbox id. A mirror backup of the pre-rewrite repo was kept outside the repo.

## 2026-11-17 (local, late night)
- Summary: a GitHub-ready README with screenshots, a script that regenerates them, and removal of client and company names before the repo goes public.
- Files touched: `README.md` (rewritten), `docs/images/*.png` (8 screenshots), `scripts/screenshots/{build.cjs,shoot.sh}`, `package.json` (`screenshots` script), and name clean-up in `plugin/page/team-inbox.html`, `plugin/skills/setup/SKILL.md`, `plugin/test/inbox.test.mjs`, `docs/product/team-inbox-product-spec.md` and this log.
- Decisions:
  - Screenshots come from the real page file running against a mocked `window.claude` with fictional people and projects, never from the live inbox, so no real names, client projects or inbox links reach a public repo.
  - The generator lives in the repo (`npm run screenshots`) so the images can be refreshed whenever the page changes, instead of drifting.
  - Headless Chrome with `--virtual-time-budget`; animations are switched off in the demo build because the composer was otherwise captured mid fade-in.
  - The hero uses a `<picture>` element so GitHub shows the dark screenshot to readers in dark mode.
  - Example values that named a client project or the owner's employer were replaced with neutral ones (`storefront`, `acme-storefront`, "Web platform team"); the live artifact id was removed from this log.
- Verified: `npm run screenshots` regenerates all 8 images; every image path and relative link in the README resolves; `npm test` 18 of 18 after the test fixture rename.
- Not verified: how GitHub renders the README (badges, the mermaid diagram, the light and dark hero), because the repo is not pushed yet.

## 2026-11-17 (local, night)
- Summary: the page moves from the Apple-style look to a Claude-style look, gains a Guide view, and gains four small page-only features. No change to the plugin, the helper CLI, the access rules or the data model.
- Files touched: `plugin/page/team-inbox.html`, `README.md` (the inbox page section), `docs/product/team-inbox-product-spec.md` (Visual direction, and a new "Added after v1" section). The live page was republished (version 9).
- Decisions:
  - Theme: warm ivory and charcoal grounds, ink primary buttons, clay as the one accent, Newsreader for titles and for user-written text, DM Sans for the interface. The owner asked for it because the product belongs to the Claude ecosystem.
  - No Anthropic or Claude logos or marks anywhere; the Guide ends with a line saying the project is independent and not endorsed by Anthropic. A Claude-like look on a public repo makes that line matter more, not less.
  - This reverses the earlier call that cream plus a warm accent looks generic. The owner's explicit request outranks that guideline.
  - Thread layout: your replies in a soft bubble on the right, everyone else's as plain serif text. It mirrors how Claude's own apps separate the two sides of a conversation.
  - `rich()` builds code formatting from DOM nodes only (no `innerHTML`), so reply text still cannot inject markup. An unclosed fence stays plain text.
  - Related asks use word overlap on title, body and accepted answer (at least 60% of the draft title's meaningful words, minimum two). It is a hint, not search; no index and no extra reads, because the asks are already in memory.
  - Shortcuts are single keys and are ignored while typing, with a modifier held, or with the composer open.
  - The Guide is static text in the page. It must be kept in step with `README.md` and the skills by hand; a comment above `renderGuide` says so.
- Verified:
  - Live page on claude.ai, desktop width, light theme: Waiting on others, an ask, and the Guide, by screenshot; no console errors.
  - Phone width, dark theme, a reply with inline code and a fenced block, the `N` shortcut and the related-asks hint, through the local mock harness (same file, mock `window.claude`).
  - `rich()` checked in Node for mixed text, an unclosed fence and an empty value.
- Not verified: the `/`, number and `?` shortcuts were not pressed in a browser (only `N` was); the Guide's wording was written from `README.md` and the skill descriptions, not from a second person's first-run.
- Follow-ups:
  - Features offered to the owner and not built: edit your own ask, nudge an ask that has waited too long, "me too" on someone else's ask, a weekly summary for leads.

## 2026-11-17 (local, evening)
- Summary: the inbox page is restyled to look like a native Apple app, at the owner's request. No data, rule or protocol change.
- Files touched: `plugin/page/team-inbox.html` (whole stylesheet, plus markup for icons, sidebar, rows, thread, composer and welcome screen), `docs/product/team-inbox-product-spec.md` (Visual direction). The live page was republished (version 8).
- Decisions:
  - System font stack first, Inter as the web fallback; IBM Plex is gone. Body letter-spacing stays near zero because San Francisco already tracks itself; tightening it again made text cramped.
  - Phone navigation is a fixed bottom tab bar with five items. Preferences is reached from the avatar at every width, so the bar stays within five.
  - Replies render as message bubbles. This reverses the earlier "no chat bubbles" rule in the spec; the owner asked for the Apple look and a thread is where it reads most clearly.
  - The composer is one `<form>` holding a title bar (Cancel, title, Send) and a scrolling body. Validation errors render at the top of the body and the body scrolls to them, because Send is no longer next to the last field.
  - Icons are thirteen line icons drawn inline as SVG paths (`ICONS` in the page script). No SF Symbols and no Apple marks, which are Apple's property.
  - Filled blue stays `#0071E3` in both themes: white text on the brighter dark-mode blue `#0A84FF` is 3.7:1 and fails AA.
- Verified:
  - Live page on claude.ai at desktop width, light theme: all six views, the ask detail and the composer, by screenshot; no console errors.
  - Phone width (400px and 560px) and the dark theme through a local harness that loads the same file with a mock `window.claude` (seeded asks, replies and members), because the automation browser window would not resize. Not checked on a real phone.
  - Fixed along the way: reply footer spacing, the add-group fields stacking full width, the search icon overlapping its placeholder, the members table wrapping mid-word on phones.
- Follow-ups:
  - Check the page once on a real iPhone (safe-area insets under the tab bar and the bottom sheet) during the pilot.

## 2026-11-17 (local, later)
- Summary: the public home moves from the personal account to a GitHub organization, so the install command no longer carries a person's name.
- Files touched: `README.md`, `plugin/.claude-plugin/plugin.json`, `plugin/page/team-inbox.html` (`MARKETPLACE`), `plugin/skills/setup/SKILL.md`, `docs/product/team-inbox-product-spec.md`. The live page was republished.
- Decisions:
  - Owner chosen: `inbox-for-claude` (free on GitHub when checked 2026-11-17). Install is now `claude plugin install team-inbox --marketplace inbox-for-claude/team-inbox --config inbox=<link>`.
  - Trade-off accepted by the owner: "claude" in the org name can read as an Anthropic project; the README states it is independent and not endorsed by Anthropic.
  - Author and licence holder stay Mikul Gohil; the marketplace owner name stays a person.
- Follow-ups:
  - The owner creates the free organization `inbox-for-claude` at github.com/account/organizations/new (GitHub has no API to create one), then the repo is created there and pushed.

## 2026-11-17 (local)
- Summary: first build of Team Inbox v1 against the approved product spec (`docs/product/team-inbox-product-spec.md`), including one-line install.
- Files touched: `.claude-plugin/marketplace.json`, `plugin/.claude-plugin/plugin.json`, `plugin/hooks/{hooks.json,session-start.mjs}`, `plugin/bin/inbox.mjs`, `plugin/reference/protocol.md`, `plugin/skills/*/SKILL.md` (8), `plugin/page/team-inbox.html`, `plugin/test/*`, `README.md`, `LICENSE`, `package.json`.
- Decisions:
  - Data lives in a claude.ai Artifact store (`db` + `user` + `assets` + `downloads`), never in this repo. Each team publishes its own page with `/team-inbox:setup`.
  - All logic lives in an offline Node CLI (`plugin/bin/inbox.mjs`); Claude only moves the documents it prepares with `ArtifactData`, because a shell script cannot call that tool.
  - Replies and events are one document each and never edited, so concurrent writers never collide; ask updates from Claude are pinned with `if_version`.
  - The SessionStart hook does no network work; it injects the inbox link and, once a day by default, a "check due" instruction.
  - `plugin.json` has no `version`, so auto-update follows commits (a pinned version blocks updates; Claude Code docs, via research 2026-11-17).
  - No `curl | bash` installer: `claude plugin install team-inbox --marketplace mikulgohil/team-inbox --config inbox=<link>` already does everything (verified against `claude plugin install --help`, Claude Code 2.1.326).
  - Visual direction changed from "warm paper + vermillion" to cool blue-grey paper with postal-ink blue, because cream-plus-vermilion is a known generic AI look.
- Verified on a live store (the owner's private test artifact):
  - `data/users/me` resolves and the result prints the caller's id; join works entirely from Claude Code.
  - `out_dir` saves bare document bodies at `<out>/<collection path>/<doc_id>.json`; versions are printed in the tool result, not in the files.
  - `batch` with `file_path` entries commits atomically.
  - Access rules: an `interact` write to `config/app` and to another member's `members/<id>` are refused; nothing can be written at `view`.
  - Page renders live; identity, counts and the ask detail view checked by screenshot. Fixed: literal "null" text from `replaceChildren(null)` (now `fill()`), and the asker being offered "Claim" on their own group ask.
  - `npm test`: 18 of 18 pass. `claude plugin validate`: passes; warnings for no icon and no version (both intentional for now).
- Not verified yet (needs a second account or another machine):
  - A second org member reading, replying and claiming; names via `profiles` for colleagues.
  - The SessionStart hook firing in the Claude Desktop Code tab.
  - `claude plugin configure team-inbox@team-inbox --json` printing the saved link (used only as a fallback).
  - Screenshot upload by a Contributor (`assets` with `upload: "interact"`).
- Follow-ups:
  - Two-account pilot with 2 or 3 teammates.
  - A 512px square PNG icon if the plugin is ever submitted to Anthropic's plugin directory.
  - Delete the example ask `VH4CH5` from the owner's inbox when the pilot starts (Preferences, "Remove example asks").
