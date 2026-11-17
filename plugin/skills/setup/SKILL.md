---
name: setup
description: Create a new Team Inbox for a team - publishes the inbox page to claude.ai, sets its access rules, seeds groups, joins the user and prints the invite for teammates. Use once per team, by the team lead.
argument-hint: "[inbox name] [--demo]"
disable-model-invocation: true
---

# Set up a Team Inbox

Read `../../reference/protocol.md` (relative to this skill's base directory) before starting; its Ground rules apply.

1. Confirm what the user wants: a NEW inbox for their team (not joining an existing one; for that, use `/team-inbox:join`).
   Ask for the inbox name if `$ARGUMENTS` does not give one (for example "Web platform team").
2. Copy the page template `../../page/team-inbox.html` into `<your session scratchpad>/team-inbox/team-inbox.html` with Bash `cp` (the Artifact tool publishes files from the working directory or the scratchpad only).
3. Publish it with the Artifact tool (load the `artifact-capabilities` skill first if your instructions require it):
   - `file_path`: the copied file
   - `icon`: `inbox`
   - `description`: `Questions and blockers between teammates' Claude Code sessions, answered when they are free.`
   - `capabilities`, exactly:
     ```json
     {"db": {"rules": [
       {"path": "config", "read": "view", "write": "admin"},
       {"path": "groups", "read": "view", "write": "admin"},
       {"path": "members", "read": "view", "write": "admin"},
       {"path": "members/{self}", "read": "view", "write": "interact"}
     ]}, "user": {"scopes": ["profile"]}, "assets": {"upload": "interact"}, "downloads": true}
     ```
   The publish result gives the inbox link (`https://claude.ai/artifact/...`).
4. Seed the store with one `ArtifactData` `batch` on that link (get `<now>` from `node ../../bin/inbox.mjs ids`):
   - `set` `config` / `app`: `{schema: 1, name: <name>, inboxUrl: <link>, blockerHours: 24, createdAt: <now>, updatedAt: <now>}`
   - `set` `groups` / `design`, `frontend`, `backend`, `qa`, `pm` with names Design, Frontend, Backend, QA, Project management and `{description: "", createdAt: <now>}`.
   Ask the user first if they want different groups.
5. Join the user (protocol: Join).
6. Check the access rules, expecting each write to be refused (a refusal is the pass):
   - `update` `config` / `app` with `as_level: "interact"` and the current `if_version`.
   - `set` `members` / `u_rule_probe_not_me_00000` with `as_level: "interact"`.
   If either write succeeds, delete what it wrote and tell the user the rules did not apply.
7. Save the link in the user's plugin settings:
   `printf '{"inbox":"%s"}' '<link>' | claude plugin configure team-inbox@team-inbox --values-stdin`
8. With `--demo` in `$ARGUMENTS`: file three example asks to groups (protocol: Raise an ask, steps 5, 7 and 8) with `"demo": true`, such as a design blocker about mobile CTAs, a backend question about an API timezone, and a QA review request. Skip the confirmation for demo asks and say they can be removed from the page's Preferences.
9. Finish with:
   - The inbox link, and: "Open it and use Share (top right) to share it with your organization as Contributor."
   - The teammate invite in a fenced code block, ready to paste into chat:
     ```
     Our questions and blockers now go through Team Inbox. One-time setup (2 minutes):
     1. Run: claude plugin install team-inbox --marketplace inbox-for-claude/team-inbox --config inbox=<link>
     2. In Claude Code, run /team-inbox:join and pick your groups.
     From then on, Claude tells you what is waiting when you start a session. Ask with /team-inbox:ask.
     ```
