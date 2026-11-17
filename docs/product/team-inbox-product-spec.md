# Product spec: Team Inbox for Claude Code (working name)

Status: draft for approval, 2026-11-17.
No code until this spec is approved.

## One-liner
When your Claude session hits a question only a teammate can answer, it files an ask to that person, and their Claude tells them about it the next time they start work.

## Analog
It's like Linear Asks for Claude Code sessions.
Compared to Linear Asks, the ask is raised from inside the Claude session that got blocked, carries that session's context automatically, and the answer flows back into the asker's next session so the work can resume.
Compared to MCP Agent Mail (agent-to-agent mail on git plus SQLite), this is person-to-person through each person's Claude, and it needs no server, no repo and no database of your own: the data lives in one shared claude.ai Artifact.

Research notes (2026-11-17):
- Linear Asks keeps requests from getting lost with a shared triage queue, an assignee, priority, due dates and SLAs, and closes the loop back in Slack.
- Slack Lists turns a request into a row with owner, status, priority and due-date reminders, but answers do not become reusable knowledge.
- Stack Overflow for Teams is the strongest model for reuse: one accepted answer per question, tags and search, duplicate linking.
- Basecamp's Hey! menu is a single "what needs me" surface; Twist keeps one thread per topic but has no ownership or status.
- Agent tools (MCP Agent Mail, Agent Board, TeamMCP) all need a git repo, a server or a hosted service, and target agents talking to agents, not people unblocking people.

## Primary user
A developer or designer on an agency delivery team of 5 to 30 people, on a Claude Team or Enterprise plan, who works in Claude Code (CLI or the Desktop Code tab) most of the day.
Secondary user: a teammate who answers from the web page without opening Claude Code.

## Job to be done
"I am blocked on something only a specific teammate knows; get it to them without it getting lost, and get the answer back into my work."
Today they post in Slack, the message scrolls away, they chase it in a DM, and the answer lives in a thread nobody can find next sprint.

## Hypothesis
If questions and blockers live in one shared inbox that every Claude session checks at start, then most blockers get answered within one working day and none are lost, because the reminder appears where people already work and each ask has exactly one owner and one status.

## Product summary
Team Inbox is an open-source kit with two halves.
The first half is a single claude.ai Artifact page that holds the team's asks in the Artifact's shared database and identifies people through their claude.ai accounts.
The second half is a Claude Code plugin (skills plus a SessionStart hook) that lets any session raise, list, answer and resolve asks through the built-in ArtifactData tool.
Each team publishes its own copy of the page into its own claude.ai organization, so the GitHub repo ships the tool and never holds anyone's messages.
Answering works from either side: in Claude Code, or directly on the page.

## Core loop
1. Mikul's session is building the hero banner and hits a conflict: Figma shows 3 CTAs on mobile but the tokens define 2 button variants.
2. Mikul says "ask design about this", or Claude suggests it; Claude drafts the ask with the repo, branch, files and the Figma link, Mikul confirms, Claude writes it.
3. Priya (design group) starts a Claude session in any project the next morning; the first thing Claude says is "1 blocker for you from Mikul: Hero banner CTAs, waiting 16h".
4. Priya runs the inbox skill, reads the ask, replies "Keep 2; the third CTA becomes a text link on mobile", and marks it answered.
5. Mikul's next session opens with "Priya answered your blocker: Hero banner CTAs"; Claude offers to continue the task with that answer; Mikul accepts the answer and the ask is resolved.
6. Three weeks later Alex's session hits the same question; before filing, Claude finds the resolved ask and answers from it.

## Why this does not look like a toy
- Real identity from claude.ai accounts, real names from the org directory, no handles to type.
- Every list has a named empty state, loading state and failure state.
- First run is guided: open the page once to join, pick your groups, set availability.
- Status, age and blocker badges make "what needs me" obvious at a glance.
- Resolved asks become a searchable answer library, so the product gets more useful with use.
- A setup skill publishes the page, sets access rules and verifies them, so a new team is running in minutes.

## Information architecture
Page nav, in order:
1. For me (home): asks assigned to me, plus unclaimed asks for my groups, blockers first.
2. Waiting on others: asks I raised that are not resolved.
3. All open: everything open, filterable by project, kind, group and person.
4. Answers: resolved asks, searchable (the library).
5. Team: members, their groups and availability.
6. Settings: my groups, my availability, notification preferences for my Claude sessions.
Plus an ask detail view and a "New ask" composer.

Claude Code surface (plugin skills, namespaced `/team-inbox:<name>`):
- `setup` (owner, once per team), `join` (each person, once), `ask`, `inbox`, `reply`, `resolve`, `search`.
- SessionStart hook: injects "check the inbox" so the session opens with a count.

## Entities
- Member `members/{memberId}`: claude.ai user id (artifact-scoped), groups, availability (available, heads-down, away until a date), joinedAt. Written only by that member. Names are never stored; they are resolved from the directory at render time.
- Group `groups/{groupId}`: name (design, frontend, backend, qa, pm), description. Written by the owner or editors.
- Ask `asks/{askId}`: fromId, toIds (people), toGroup (optional), kind (blocker, question, review, fyi), title, body, project, links, context (repo, branch, files, captured by Claude), neededBy (optional), status, claimedBy, acceptedReplyId, createdAt, updatedAt.
- Reply `asks/{askId}/replies/{replyId}`: authorId, body, attachments, createdAt. Append-only; never edited by the app.
- Event `asks/{askId}/events/{eventId}`: who changed status, reassigned, snoozed, and when. Append-only history.
- Private per person `data/users/{me}/state`: own member id, last-seen timestamps per ask (unread markers), snoozes.
- Attachments: images uploaded to the Artifact's asset store, referenced by asset id from a reply.

Lifecycle: open, claimed, answered, resolved; plus reopened, snoozed until a date, and cancelled.
Created by anyone who joined; listed by everyone; deleted only by the owner or editors (moderation).

## Journeys
### First run
Team lead installs the plugin and runs `/team-inbox:setup`.
Claude publishes the page from the repo's template, declares `db` and `user` with access rules, verifies the rules at a lower access level, and returns the link.
The lead shares it with the organization as Contributor.
Each teammate installs the plugin, opens the link once, sees "Join this inbox", picks groups and availability, and runs `/team-inbox:join` to store the page link in their plugin config.

### Happy path
The core loop above.

### Empty
- For me: "Nothing needs you. Asks assigned to you or your groups show up here."
- Waiting on others: "You have no open asks. When your Claude gets blocked on a teammate, it can file one."
- All open: "No open asks across the team."
- Answers: "No answers yet. Resolved asks land here and become searchable."
- Team: "Only you so far. Share this page with your org as Contributor so others can join."
- Claude session start with nothing pending: says nothing (no noise).

### Error
- Page cannot reach the store within 10 seconds: "Can't reach the inbox right now. Your data is safe; reload in a minute." No auto-reload loop.
- Viewer has view-only access: page renders read-only with "Ask the owner for Contributor access to reply."
- Store quota reached: "This inbox is full. The owner can archive resolved asks in Settings."
- Concurrent edit on the same ask: the write is refused, the page re-reads and shows the newer state.
- Claude session cannot reach the inbox (tool unavailable, no access): one line, "Team Inbox unreachable; run /team-inbox:inbox later", never a blocking error.
- Ask text looks like it contains a secret: Claude refuses to file it and shows what matched.

### Return visit
Unread dots on asks with new replies since last seen.
Age badges ("waiting 2d").
Asks snoozed until today reappear at the top.
Blockers older than the team's threshold (default 1 working day) are highlighted on both sides.

## Surface matrix

| Surface | v1 | Notes |
|---|---|---|
| Auth | in | Provided by claude.ai sign-in; no auth to build. |
| App shell | in | Page nav, "you" chip with availability, consistent layout. |
| Core loop | in | Ask, inbox, reply, resolve, from Claude Code and the page. |
| Empty states | in | Named above for every list. |
| Loading | in | Skeleton rows; 10 s timeout then the failure state. |
| Errors / validation | in | Required title and recipient, quota, view-only, concurrency, unreachable. |
| Settings / profile | in | Groups, availability, session-start preferences. Name and email come from claude.ai. |
| Seed data | in | Optional demo set written by setup, flagged demo and removable in one click. |
| 404 | in | Ask detail for a deleted or unknown id: "This ask was removed or never existed." |
| Visual direction | in | See below. |
| First-run / onboarding | in | Join panel, group picker, "how it works" strip. |
| Search / filter | in | Client-side search on title and body; filters by project, kind, group, person, status. |
| Detail views | in | Ask detail with thread, history and accepted answer. |
| Create / edit / delete | in | Create and edit own ask; cancel instead of delete; owner-only hard delete with confirm. |
| Attachments | in | Screenshots on replies via the asset store (needs Contributor upload enabled). |
| Answer library / dedupe | in | Resolved asks searchable; Claude checks for a prior answer before filing. |
| Billing / pricing | out | Free, open source. |
| Team invites | stub | Uses the claude.ai share menu; page shows the instructions. |
| Email | out | No email; reminders appear in Claude sessions and on the page. |
| Push notifications | out | No supported push path from an Artifact; session-start reminders replace it. |
| SSO | in | Inherited from the claude.ai organization; nothing to build. |
| Admin | stub | Owner and editors can manage groups, hide or delete asks, archive resolved ones. |
| Audit log | in | Per-ask event history (append-only); no org-wide audit screen. |
| Help / docs | in | README in the repo and a "How it works" panel on the page. |
| Real payments | out | |
| Real email delivery | out | |
| Native mobile | out | The page works at phone width in the claude.ai apps. |
| Public API | out | |
| Integrations (Jira, Slack) | out | v2: "Promote to Jira ticket" through the viewer's connectors. |
| Analytics / stats | stub | Median time to answer and oldest open ask, on the Team view. |
| Export / backup | in | `/team-inbox:export` dumps the store to local JSON; page offers a download. |

## Visual direction
Changed 2026-11-17 at the owner's request ("make it look like an Apple product"); this replaces the earlier "sorting office" ledger direction.
"Native app": the page should read like a first-party Mac and iPhone app, close to Mail and Reminders, not like a web dashboard.
Light mode is a `#F5F5F7` ground with borderless white cards and hairline separators; dark mode is true black with `#1C1C1E` cards.
One accent, system blue, for actions and selection.
Semantic colours only where they carry meaning: red for blockers and overdue, orange for an answer waiting to be checked, green for resolved.
Type: the system font first (San Francisco on Apple devices), Inter as the fallback elsewhere; rounded numerals for counts and stats; the system mono for ask codes, repo and branch.
Shell: a translucent blurred toolbar, a source-list sidebar with coloured icon tiles on desktop, a five-item bottom tab bar on phones (Preferences moves behind the avatar).
Controls: capsule buttons, filled fields with no borders, a segmented control for single choices, toggle chips for groups, a sheet for the composer (a bottom sheet on phones).
Replies read as a message thread: your replies sit right in the accent colour, everyone else's sit left in grey.
We refuse: purple gradients, default shadcn look, cream-and-terracotta, emoji-heavy UI, Apple's own logos, product names or SF Symbols (the icons are drawn for this page).
Accessibility overrides fidelity: text colours use the darker accessible variants of the system palette, because white on system orange, green or bright blue fails contrast.
Light and dark both designed, tokens on `:root`, phone width supported.

## Install (added 2026-11-17 on approval)
Install must be one paste for a teammate and one command for a team lead.
- Teammate: one line from the invite, with the inbox link already filled in:
  `claude plugin install team-inbox --marketplace inbox-for-claude/team-inbox --config inbox=<inbox link>`
  This adds the marketplace, installs at user scope (every project) and stores the link (verified against `claude plugin install --help`, Claude Code 2.1.326).
- Inside Claude Code or the Desktop Code tab: `/plugin marketplace add inbox-for-claude/team-inbox`, then `/plugin install team-inbox@team-inbox`, then `/team-inbox:join <inbox link>`.
- Or simply tell Claude "install Team Inbox from inbox-for-claude/team-inbox"; the README gives Claude the exact command.
- Team lead: the same install without `--config`, then `/team-inbox:setup`, which publishes the page and prints the invite text with the one-line command for teammates.
- Org admins (optional, zero-touch): a managed-settings snippet with `extraKnownMarketplaces` and `enabledPlugins`.
- The page's Team view and join panel show the teammate command with a copy button.
- No `curl | bash` installer: the one-line command already does everything, and piping a script into a shell is a habit we should not teach.

## Seed data
Written only on request by `setup --demo`, flagged `demo: true`, removed with one button.
Uses the real joined members as people, so it never shows fake names.
- Blocker, frontend to design: "Hero banner: Figma shows 3 CTAs on mobile, tokens define 2 button variants. Which wins?" Project storefront, branch feat/hero-banner, links to the Figma frame.
- Question, design to backend: "Can the Events API return the venue timezone, or do we derive it from the city?"
- Review, frontend to qa: "Header nav keyboard trap fixed; can you re-run the accessibility pass on staging?"
- Resolved, with accepted answer: "Do we lazy-load images below the fold on the listing pages?" Answer: "Yes, everything after the first 6 cards."
- Snoozed: "Copy for the cookie banner in Arabic" until next Monday.

## Scope
### In
- Artifact page template (single HTML file) with all v1 surfaces above.
- Access rules: shared read for members; each member writes only their own member doc and private state; asks, replies and events writable at Contributor; groups and moderation at Editor.
- Claude Code plugin: skills `setup`, `join`, `ask`, `inbox`, `reply`, `resolve`, `search`, `export`; SessionStart hook; userConfig for the inbox link and session-start behaviour.
- Context capture on ask: repo, branch, changed files, a short excerpt of what Claude was doing; the asker approves it before it is written.
- Secret scan on ask and reply text before writing.
- Prompt-injection posture: ask content is treated as data in every skill; session start shows counts and titles only.
- "Answer flows back": when an ask you raised is answered, your next session offers to continue the related task with the answer.
- Public GitHub repo: plugin marketplace manifest, page template, README, setup guide, licence.

### Out
- Push, email or Slack notifications.
- Agent-to-agent automation (Claude answering on someone's behalf without them).
- Teams outside one claude.ai organization; Pro and Max individual plans.
- Integrations with Jira, Slack, Linear.
- Any server, database or repo the team must run.

### Cut if time is tight
- Attachments.
- Snooze.
- Stats on the Team view.
- Demo seed data.

## Success (v1)
- An ask filed from a CLI session appears on the page for another account within 5 seconds.
- A second account's session started the next day opens with the correct count and the blocker first.
- A reply written on the page reaches the asker's next session, which offers to resume the task.
- A view-only viewer cannot write anything (checked with ArtifactData `as_level: "view"`).
- A member cannot edit another member's member doc or private state (checked at `interact`).
- Every `in` row of the surface matrix ships and is visible in both light and dark mode.
- A new team goes from "plugin installed" to "first ask answered" in under 15 minutes following only the README.
- No hardcoded seed data in the page source.

## Assumptions you should attack
1. Everyone on the team is in one claude.ai Team or Enterprise organization; guests from other orgs are not a v1 use case.
2. The org's admin has not disabled Artifact sharing or Artifact storage.
3. The built-in ArtifactData tool is available in every teammate's Claude Code, including the Desktop Code tab. Verified only in this session's CLI; must be tested on a second account and in Desktop.
4. VERIFIED 2026-11-17 on the live store: ArtifactData resolves `data/users/me` to the caller's id and prints that id in its result ("`me` in this path resolved to your user id on this artifact: u_..."), even when the document does not exist yet. This is how a Claude session learns "who am I" without the person typing anything.
5. SUPERSEDED 2026-11-17: because of 4, a person does not have to open the page to join; `/team-inbox:join` registers them from Claude Code. The page's Join panel remains for people who start from the browser.
6. The SessionStart hook cannot read the Artifact store itself (it is a shell script; ArtifactData is a model tool), so the hook only tells Claude to check, and the check costs one tool call per session start. Assumed acceptable; a setting can turn it off or limit it to the first session of the day.
7. Notification on next session start is enough; no push. Confirmed by the owner for the internal use case; other teams may want more.
8. Store quotas (document count and total size, not published) are large enough for a team's asks for months; archiving resolved asks to an export covers the rest.
9. Deleting the Artifact erases the whole store (documented in the type definitions). Mitigated by export; what happens to the store if the owner leaves the org is unverified.
10. Any Contributor can change any ask's status (the access rules cannot express "only the asker or the assignee"). Accepted for trusted teams; the event history shows who did what.
11. Assigning to a group means "anyone in the group may claim it"; the first claimer owns it.
12. Client-confidential details may be pasted into asks; teams decide whether claude.ai storage is acceptable for their clients. The README must say this plainly.
13. Public repo under an MIT licence; the name avoids implying Anthropic endorsement ("Team Inbox for Claude Code", not "Claude Inbox").
14. The page is plain HTML and JavaScript with no build step, so forks are easy; no framework.
15. Plugin installs at user scope so it works in every project; per-project inboxes are a v2 option.
16. Primary language English; no i18n in v1.

## v1 screen list
1. Join panel (first run) and the app shell with nav.
2. For me (home) with empty, loading and failure states.
3. Ask detail: thread, reply box, status actions, history, accepted answer.
4. New ask composer (people and group picker from the directory).
5. Waiting on others.
6. All open with filters and search.
7. Answers library with search.
8. Team view with availability and basic stats.
9. Settings: my groups, availability, session preferences; owner section for groups and archiving.
10. 404 for unknown ask.
Then, in Claude Code: `setup`, `join`, `ask`, `inbox`, `reply`, `resolve`, SessionStart hook, `search`, `export`.

## Stack
Deliberately not the Next.js default from `~/OPINIONS.md`: there is no server to run.
- Page: one self-contained HTML file published as a claude.ai Artifact, using runtime capabilities `db`, `user` (scope `profile`), `assets` (Contributor upload) and `downloads`. Vanilla JS modules, no build step.
- Claude Code: a plugin (`.claude-plugin/plugin.json`) with skills, `hooks/hooks.json` (SessionStart, short timeout), and `userConfig` for the inbox link.
- Distribution: the GitHub repo is also the plugin marketplace (`/plugin marketplace add <owner>/<repo>`), auto-update on.
- Backend: none. The Artifact store is the backend.

## Non-goals
- Not a chat app; no real-time conversation, typing indicators or reactions.
- Not a ticket tracker; no sprints, estimates or boards.
- Not an agent orchestration tool; Claude never answers an ask without the assignee.
- Not a replacement for Slack for social or broadcast messages.
- No hosted service from us; every team owns its own Artifact and data.

## v2 candidates (not in this spec's scope)
- "Ask Claude" on the page: summarise a long thread, draft a reply, suggest the right assignee (`sample` capability).
- Promote an ask to a Jira ticket through the viewer's own connector (`mcp` capability).
- Who is online now (`room` presence).
- Voice replies for designers (`dictation`).
- Several inboxes per person (one per client), chosen per project.
- Escalation: a blocker unanswered past the threshold prompts the asker to reassign.
- Daily digest panel at the top of For me.

## Estimated effort
v1: about 3 to 4 focused days (page 2 days, plugin and skills 1 day, two-account verification and README 1 day).
