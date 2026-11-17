# Team Inbox for Claude Code

When your Claude session hits a question only a teammate can answer, it files an ask to that person.
Their Claude tells them about it the next time they start work, they answer when they are free, and the answer flows back into your next session so the work can carry on.

No server, no repo, no database to run.
The asks live in one shared claude.ai Artifact that your team owns, and a small Claude Code plugin reads and writes it.

```
 your session                     the team's inbox page                  teammate's session
 ───────────                      (a claude.ai Artifact)                 ──────────────────
 "ask design which CTA wins"  ──▶  ask K3F9X2  [BLOCKER]  ──▶  "1 blocker for you from Mikul,
  + repo, branch, files            open → answered → resolved     waiting 16h"
                              ◀──  reply: "keep 2, the third   ◀──  /team-inbox:reply K3F9X2
 "Priya answered your blocker.      becomes a text link"
  Carry on with that?"
```

People without Claude Code open can answer straight on the page, in the browser or the Claude app.

## Requirements

- Everyone is in the same claude.ai **Team or Enterprise** organization, and Artifact sharing is not turned off by your admin.
- **Claude Code** (CLI, or the Code tab in Claude Desktop) signed in with that organization account, recent enough to have the Artifact tools (built and tested on 2.1.326).
- Node.js 18 or later on each machine (the plugin's helper is a single Node script, no dependencies).

## Install

### Team lead: once per team (about 3 minutes)

```bash
claude plugin install team-inbox --marketplace mikulgohil/team-inbox
```

Then, in Claude Code:

```
/team-inbox:setup Our team name
```

Setup publishes the inbox page into your claude.ai account, sets its access rules, creates starter groups (design, frontend, backend, qa, pm), checks the rules work, connects your own plugin, and prints an invite to paste into your team chat.
Open the page it links and use **Share** to share it with your organization as **Contributor**.
Add `--demo` to start with three example asks you can remove later.

### Teammates: one line

The invite from setup contains the exact command with your inbox link filled in:

```bash
claude plugin install team-inbox --marketplace mikulgohil/team-inbox --config inbox=https://claude.ai/artifact/XXXX
```

This adds the marketplace, installs the plugin for every project, and connects it to your inbox.
Then run `/team-inbox:join` in Claude Code to pick your groups.
The page's Team view shows the same command with a copy button.

### Other ways to install

Inside Claude Code or the Desktop Code tab:

```
/plugin marketplace add mikulgohil/team-inbox
/plugin install team-inbox@team-inbox
/team-inbox:join https://claude.ai/artifact/XXXX
```

Or just tell Claude: "Install Team Inbox from mikulgohil/team-inbox and join https://claude.ai/artifact/XXXX".

**For admins (zero-touch):** add this to your organization's managed settings, and the plugin installs for everyone at their next session start.

```json
{
  "extraKnownMarketplaces": {
    "team-inbox": {
      "source": { "source": "github", "repo": "mikulgohil/team-inbox" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "team-inbox@team-inbox": true }
}
```

People still run `/team-inbox:join <link>` once, because the link is your team's own.

## Daily use

| Command | What it does |
|---|---|
| `/team-inbox:ask @design which CTA wins on mobile?` | Files an ask with your repo, branch and files attached. You see the draft before it is sent. |
| `/team-inbox:inbox` | What is waiting for you, replies on your asks, and what you are waiting on. Add a code to open one ask. |
| `/team-inbox:reply K3F9X2` | Answers an ask. Claude can help draft from the code in front of you; you approve the text. |
| `/team-inbox:resolve K3F9X2` | Accepts an answer, or claims, reopens, reassigns or cancels. |
| `/team-inbox:search timezone` | Looks through resolved asks before you ask again. |
| `/team-inbox:export` | Backs the whole inbox up to local JSON. |

You can also just talk: "ask Priya whether the venue API returns a timezone", "anything in my inbox?", "tell Alex the header fix is on staging".
When Claude itself gets stuck on something only a teammate knows, it offers to file the ask rather than guess.

### The session-start check

By default your first Claude Code session each day opens with a line like:

```
Team Inbox: 1 blocker for you from Priya (Hero banner CTAs, waiting 16h). 1 reply on your asks. Run /team-inbox:inbox.
```

Nothing is shown when nothing is waiting.
Change it with `/plugin configure team-inbox@team-inbox`: `first-of-day` (default), `every-session`, or `off`.

## The inbox page

Views: **For me** (assigned to you or unclaimed in your groups, blockers first), **Waiting on others**, **All open**, **Answers** (resolved asks, searchable), **Team** (members, availability, time-to-answer stats, invite), **Preferences**.
On an ask: the thread, screenshots, accept an answer, claim, snooze, reassign, reopen, cancel, and the full history of who changed what.
Owners and editors also get inbox settings, groups, backup download, and archiving of old asks.

## How it works

- **The page** is a single HTML file (`plugin/page/team-inbox.html`) published as a claude.ai Artifact with a shared database (`db`), viewer identity (`user`), screenshot uploads (`assets`) and downloads.
- **The plugin** gives Claude Code eight skills and a SessionStart hook.
  Claude reads and writes the inbox with its built-in `ArtifactData` tool, acting as you, with your access.
- **The helper CLI** (`plugin/bin/inbox.mjs`) holds all the logic: ids, validation, status changes, the secret scan and the digest.
  It is offline and tested; Claude only moves the documents it prepares.
- **The hook** never touches the network.
  It tells Claude where the inbox is and, once a day by default, asks it to run the read-only check before its first answer.

The full protocol Claude follows is in [`plugin/reference/protocol.md`](plugin/reference/protocol.md).

## Data, privacy and safety

- **Where the data lives:** in your organization's claude.ai, inside the Artifact's database. Nothing goes anywhere else, and this repository never sees any of it.
- **Who can see it:** everyone the page is shared with. Share it with your organization as Contributor; Viewers can read but not write.
- **Access rules** (enforced by claude.ai, checked by `/team-inbox:setup`):

  | Data | Read | Write |
  |---|---|---|
  | Inbox settings, groups | everyone with access | owner and editors |
  | Member profiles | everyone with access | each member their own only |
  | Asks, replies, history | everyone with access | Contributors and up |
  | Your unread markers and snoozes | only you | only you |

- **Deleting the page deletes every ask in it, for good.** Use `/team-inbox:export` or the page's backup button first.
- **Client confidentiality:** asks often mention client work. Decide as a team whether that is allowed in claude.ai under your client agreements before you start.
- **Secrets:** both the plugin and the page refuse text that looks like an API key, token, password, private key or credentials in a URL.
- **Prompt injection:** asks are written by teammates and end up in someone else's Claude session. The plugin treats inbox text as data only, the session-start line carries counts and short titles, and Claude never acts on instructions found inside an ask.
- **Trust inside the team:** any Contributor can change any ask's status (the platform's access rules cannot say "only the asker"). Every change is recorded in the ask's history.

## Limits

- Notifications arrive when you start a Claude session or open the page. There is no push, email or Slack message.
- One inbox holds up to 25,000 documents (an ask with a few replies is about 5). Archive old asks from Preferences.
- Teams that span several claude.ai organizations are not supported.
- The session-start check costs a few tool calls once a day; set it to `off` if you prefer to run `/team-inbox:inbox` yourself.
- Claude Code asks permission the first time it uses `ArtifactData` and the helper script; allow them in `/permissions` if the prompts get in the way.

## Development

```bash
npm test                                   # node --test, no dependencies
claude plugin validate ./plugin            # manifest, skills and hooks
claude plugin validate .                   # marketplace
```

Layout:

```
.claude-plugin/marketplace.json   this repo is its own plugin marketplace
plugin/.claude-plugin/plugin.json plugin manifest and user settings (inbox link, session check)
plugin/hooks/                     SessionStart hook
plugin/skills/<name>/SKILL.md     setup, join, ask, inbox, reply, resolve, search, export
plugin/reference/protocol.md      the procedures every skill follows
plugin/bin/inbox.mjs              offline helper CLI
plugin/page/team-inbox.html       the inbox page template
plugin/test/                      tests
docs/                             product spec and change log
```

## License

MIT. See [LICENSE](LICENSE).
Team Inbox is an independent project and is not made or endorsed by Anthropic.
