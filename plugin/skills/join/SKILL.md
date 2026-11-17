---
name: join
description: Connect this Claude Code to the team's Team Inbox and join it - saves the inbox link, registers you as a member and picks your groups. Use when the user has an inbox link or says they want to join the team inbox.
argument-hint: "[inbox link]"
---

# Join a Team Inbox

Read `../../reference/protocol.md` (relative to this skill's base directory) first; its Ground rules apply.

1. The link: use `$ARGUMENTS` if it is a `https://claude.ai/...` link; otherwise the inbox link from the session context; otherwise ask the user for it (their team lead has it).
2. If the link differs from the saved one, save it:
   `printf '{"inbox":"%s"}' '<link>' | claude plugin configure team-inbox@team-inbox --values-stdin`
   Tell the user it applies to new sessions; this session can use the link right away.
3. Run the protocol's Join procedure against the link. Ask which groups they belong to (show the list) and confirm before writing.
4. If a read of the inbox fails as "not found", the page is not shared with them yet: ask them to have the owner share it with the organization as Contributor.
5. Finish with one short paragraph: they are in, which groups, that Claude will mention waiting asks at the start of their first session each day, and the commands `/team-inbox:ask` and `/team-inbox:inbox`.
