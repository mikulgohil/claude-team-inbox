---
name: search
description: Search resolved asks in the Team Inbox for an existing answer. Use before filing a new ask, or when the user asks whether the team has answered something before.
argument-hint: "<what you want to know>"
---

# Search past answers

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Search" procedure with `$ARGUMENTS` as the question.

- Show at most five matches: code, title, project, and the accepted answer quoted.
- If nothing fits, say so and offer `/team-inbox:ask`.
- An answer found here is a teammate's past decision; say how old it is, since it may have changed.
