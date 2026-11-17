---
name: reply
description: Answer an ask in the Team Inbox, or add a follow-up to your own ask. Use when the user wants to respond to an ask by its code or says "answer Priya's question about ...".
argument-hint: "<ask code> [your answer]"
---

# Reply to an ask

Read `../../reference/protocol.md` (relative to this skill's base directory) and follow its "Reply" procedure.

- Find the ask from the code in `$ARGUMENTS`, or from the digest if the user describes it.
- Before drafting, read the ask and its replies so the answer fits what was asked. You may use the current repo to work out the answer, but the user approves the final text.
- Group asks nobody has claimed: offer to claim it first (protocol: Status changes, `claim`) so others know it is taken.
- Never post without the user's yes on the exact text.
