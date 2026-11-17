---
name: ask
description: File a question or blocker to a teammate or group in the Team Inbox, with the current repo, branch and files attached. Use when the user says "ask <person/group> ...", when they are blocked on a decision only a teammate can make, or when you are blocked on information only a teammate has (offer it, do not file it unasked).
argument-hint: "@person-or-group your question"
---

# Raise an ask

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Raise an ask" procedure.

- `$ARGUMENTS` usually names the recipient and the question; treat the rest of the conversation as context.
- When you are the one who is blocked (a missing design decision, an API contract, a content question), offer the ask in one sentence instead of guessing: "Want me to ask design about this in the Team Inbox?"
- Kind: `blocker` only when work cannot continue without the answer; `review` for "please check this"; `fyi` for no reply needed; otherwise `question`.
- After sending, carry on with whatever work does not depend on the answer, and say what you are leaving open.
