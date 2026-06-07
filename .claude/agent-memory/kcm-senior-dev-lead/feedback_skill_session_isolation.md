---
name: feedback-skill-session-isolation
description: Running many skills then making edits in the same turn blocks Edit/Write via bgIsolation; a new user turn clears it
metadata:
  type: feedback
---

When multiple skills are invoked sequentially in a single turn, Claude Code's `bgIsolation: "worktree"` guard may block all subsequent Edit and Write calls in that same turn with "This background session hasn't isolated its changes yet." The next user turn clears the isolation — edits work normally again.

**Why:** The `bgIsolation: "worktree"` setting in `.claude/settings.json` is correct for true background agents. Sequential skill invocations within one turn can trip the same guard on the orchestrating session. The flag resets on the next conversation turn.

**How to apply:** If Edit/Write is blocked after a multi-skill review round, do not advise the user to open a new terminal session. Simply ask them to send a follow-up message ("fix the P1 issues") — the next turn will unblock edits. Alternatively, split review and implementation into separate turns from the start.
