---
name: export
description: Back up the whole Team Inbox (settings, groups, members, asks, replies and history) to local JSON files.
argument-hint: "[folder]"
disable-model-invocation: true
---

# Export the Team Inbox

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Export" procedure.

- With a folder in `$ARGUMENTS`, use it as the base instead of the scratchpad (it must be a folder the user named; confirm before writing outside the project).
- The backup contains teammates' questions and answers; remind the user to store it where the team's client data is allowed to live.
- Deleting the inbox page deletes its data for good, so suggest an export before any archive or delete.
