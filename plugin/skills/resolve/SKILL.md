---
name: resolve
description: Change the status of a Team Inbox ask - accept an answer, mark resolved, claim, reopen, reassign or cancel. Use when the user says an answer works, wants to close or cancel their ask, take a group ask, or hand an ask to someone else.
argument-hint: "<ask code> [accept|resolve|claim|reopen|reassign|cancel]"
---

# Change an ask's status

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Status changes" procedure.

- Default action: `accept` when the user's own ask has replies (ask which reply if there are several), otherwise ask what they want.
- Accepting stores the answer on the ask, so it shows in the Answers library and future searches find it.
- Confirm before `cancel` and before `reassign` (say who it goes to).
- After accepting an answer to a blocker, offer to continue the work it was blocking.
