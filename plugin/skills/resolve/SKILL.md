---
name: resolve
description: Act on a Team Inbox ask - accept an answer, mark resolved, claim, reopen, reassign, cancel, nudge, or follow and unfollow. Use when the user says an answer works, wants to close or cancel their ask, take a group ask, hand an ask to someone else, chase an ask that is taking too long, or says "me too" about someone else's ask.
argument-hint: "<ask code> [accept|resolve|claim|reopen|reassign|cancel|nudge|follow|unfollow]"
---

# Change an ask's status

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Status changes" procedure.

- Default action: `accept` when the user's own ask has replies (ask which reply if there are several), otherwise ask what they want.
- Accepting stores the answer on the ask, so it shows in the Answers library and future searches find it.
- Confirm before `cancel` and before `reassign` (say who it goes to).
- After accepting an answer to a blocker, offer to continue the work it was blocking.
- `nudge` is for an ask that is overdue or has waited long enough to hurt. Say who will see it; the CLI allows one nudge every 4 hours.
- `follow` is "me too": the user needs the same answer. They hear about replies and the resolution in their own session check, and they can nudge too.
