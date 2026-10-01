---
name: brainstorm-gaps
description: Stress-test an idea, project, feature or plan to surface the gaps the user isn't seeing (unstated assumptions, failure modes, dismissed alternatives, hidden costs, second-order effects) through short rounds of ranked questions, each with a recommended answer and the cheapest way to check it. Use only when the user invokes it by name or explicitly asks to find blind spots, gaps, holes or risks in what they're planning ("what am I missing?", "poke holes in this", "stress-test this idea"). Not a spec or planning workflow, so it writes no files and starts no implementation. Not for reviewing existing code.
disable-model-invocation: true
---

# Brainstorm gaps

The user is exploring and wants to see what they're missing, not to be walked through a process.
Find the few gaps that would hurt most if they stayed unseen, and settle each one as cheaply as
possible. Questions are the tool, not the goal: a session that asks forty valid questions has
still failed, because the user can't tell which five mattered.

Reply in the user's language. This file being in English says nothing about the conversation's
language.

## 1. Play it back: said vs. assumed

Before asking anything, read the context that exists: the conversation, the repository, any notes
the user points to. Then restate the idea as two short lists:

- **You said**: what the user actually stated.
- **I'm assuming**: what you filled in to make the idea coherent, such as who it's for, scale,
  constraints, what success looks like and what's out of scope.

Most blind spots live in the second list, because neither of you noticed it was a choice. Ask the
user to correct it; the corrections are the first findings.

If the idea is really several independent projects, say so now and ask which one to explore first.
Gaps found across a bundle of projects are too diffuse to act on.

## 2. Look through the lenses

Generate candidate gaps by running the idea through the lenses that fit. A weekend prototype
doesn't need a compliance lens. Show the user what a lens found, never the lens list itself.

| Lens | What it asks |
|---|---|
| Premise | Is the problem real, and does this solve it? What evidence exists beyond the user's belief? |
| Pre-mortem | Three months from now this failed or was abandoned. What is the most likely story? |
| Inversion | What would make this pointless, harmful or impossible? Is any of that already partly true? |
| Alternatives | What are 2–3 genuinely different routes to the same outcome, including not building it or using something that exists? |
| Edges | Empty, huge, concurrent, malformed, offline, partial-failure, first-run and abuse cases. |
| Cost and operation | Money, time, maintenance, data ownership, privacy, dependencies that can vanish or change terms. |
| Second order | What does this change downstream, and what becomes hard to change later? |

Find facts yourself before asking. If a gap hinges on something you can look up (a file in the
repository, a library's limits, a price, whether a tool already exists), read, search or delegate
to a sub-agent if your host has one. Ask the user only for decisions, preferences and knowledge
that only they have. Asking for a fact you could look up spends their attention on the wrong
thing.

## 3. Rank, then ask in rounds

Score each candidate by **impact if wrong × how uncertain it is**. Drop the ones that are cheap to
reverse later: a decision you can undo is settled faster by trying it than by discussing it.
Present the top 3–5 as one round, each in this shape:

```
**G1 · <short title>**: <the gap in one or two sentences: what is unseen and why it matters>
- Question: <what the user has to decide or tell you>
- My take: <your recommended answer or best hypothesis, and why>
- Cheapest check: <how to settle it if it stays uncertain: a search, a 30-minute spike, a sketch, one conversation>
```

A question belongs in this round only if it doesn't depend on another question still open; the
dependent ones wait for the next round. Accept terse replies ("G1 ok, G2 no because X, G3 skip").

After each round, close what was settled, add what the answers opened, re-rank and ask the next
round. When an answer changes the premise, run the lenses again instead of patching the old list.

## 4. Stop early

Stop when what is left is cheap to reverse or cheap to discover by building, not when every
branch has been explored. Exploratory work learns more from a spike than from a fifth round of
questions. Two or three rounds is usually enough; past four, say so and ask whether to continue.
Stop at once when the user says so.

## 5. Close with a summary

End in the chat with three short lists:

- **Decided**: the gaps that were closed and what was chosen.
- **Open bets**: what is still assumed, now knowingly.
- **Check first**: the 1–3 cheapest experiments that would retire the biggest open bets, in order.

Write it to a file only if the user asks. Don't start implementing: what happens next is the
user's call.

## Rules for every round

- **One concrete gap per item.** "Have you thought about scale?" is not a gap. "At 10k uploads a
  day the free tier's 1 GB fills in about a week" is. A vague gap gives the user nothing to decide.
- **Always give your take.** A bare question hands all the thinking back to the user, which is the
  work they asked you to share.
- **Disagree when you disagree.** Going along with a weak idea to be agreeable is the one failure
  that makes this skill worthless.
- **Don't bring back a dismissed gap** unless new information changes it, and then say what
  changed. Repeating it reads as not listening.
- **Stay light.** No templates, specs, files or approval gates unless the user asks for them. The
  user chose this skill because they didn't want a process.
