---
name: ask
description: File a question or blocker to a teammate or group in the Team Inbox, with the current repo, branch and files attached, or edit an ask the user raised. Use when the user says "ask <person/group> ...", when they are blocked on a decision only a teammate can make, when you are blocked on information only a teammate has (offer it, do not file it unasked), or when they want to change the wording, kind or date of their own ask.
argument-hint: "@person-or-group your question | edit <ask code>"
---

# Raise an ask

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Raise an ask" procedure.
When `$ARGUMENTS` starts with `edit` and a code, follow "Edit an ask" instead.

- `$ARGUMENTS` usually names the recipient and the question; treat the rest of the conversation as context.
- When you are the one who is blocked (a missing design decision, an API contract, a content question), offer the ask in one sentence instead of guessing: "Want me to ask design about this in the Team Inbox?"
- Kind: `blocker` only when work cannot continue without the answer; `review` for "please check this"; `fyi` for no reply needed; otherwise `question`.
- After sending, carry on with whatever work does not depend on the answer, and say what you are leaving open.
