# Team Inbox change log

Hand-written decisions and verification notes, newest first.

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
- Verified on a live store (artifact `XXXX`, owner's own account):
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
