# Install

This skill works on any AI assistant you can give custom instructions to. Pick your platform below.
All three take about two minutes.

> **One thing to know first:** the coach is `SKILL.md`. It relies on the two files in `references/`
> for its full voice and its medical-safety boundary. On platforms that load a whole folder (like
> Claude Code), that happens automatically. On platforms where you paste instructions (like ChatGPT
> or a Claude Project), **paste the reference files first, then `SKILL.md`** — instructions for
> that are below.

---

## Claude Code

1. Unzip this folder into your Claude Code skills directory:
   ```bash
   unzip summit-weekly-reflection.zip -d ~/.claude/skills/
   ```
   You should end up with `~/.claude/skills/summit-weekly-reflection/SKILL.md`.
2. Start (or restart) Claude Code in any project.
3. Say **"start my weekly reflection"** or **"set my habits for the week."** The skill triggers on
   its own.

## Claude.ai — as a Project

1. Create a new **Project** (left sidebar → Projects → New).
2. Open the project's **Custom Instructions** (or "Set project instructions").
3. Paste the contents of these files **in this order**, separated by a blank line:
   1. `references/coach-voice.md`
   2. `references/clinical-guardrail.md`
   3. `references/why-small-experiments.md`
   4. `SKILL.md`
4. Start a chat in that project and say **"start my weekly reflection."**
5. Each week, paste your **Summit Card** back into a new chat in the same project to continue.

## ChatGPT — as a Custom GPT or in custom instructions

**Custom GPT (recommended):**
1. Create a new GPT (ChatGPT → Explore GPTs → Create).
2. In **Instructions**, paste the files in this order: `coach-voice.md`, then
   `clinical-guardrail.md`, then `why-small-experiments.md`, then `SKILL.md`.
3. Name it "Summit Weekly Reflection," save, and start chatting.

**Or in a single conversation:** paste those same files (in that order) as your first message,
then say "start my weekly reflection." Keep your Summit Card to paste back next week.

---

## Using it each week

- **First time:** it walks you through your vision and your first few experiments, then hands you a
  **Summit Card** — a short markdown block. Save it anywhere (notes app, a doc).
- **Every Sunday after:** paste your Summit Card back in and say "weekly reflection." It checks your
  vision, reflects on last week, and helps you set the next one.

That Card is the whole memory. No account, nothing stored on a server — it stays with you.

---

*Questions or want the full coaching experience? → [summithealth.app](https://summithealth.app)*
