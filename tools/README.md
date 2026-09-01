# Tools — the method, not the product

Nothing in this folder ships. It is here so the design and engineering decisions in the app can be
traced back to the rules that produced them, rather than read as taste.

If you are reviewing the application, everything you need is in the repository root. This folder
answers a different question: *how were those choices made.*

---

## `skills/` — the design methodology

Seven skill packs, MIT licensed, from a library the author already uses on other work. They are a
searchable ruleset — styles, palettes, font pairings, UX guidelines, component patterns — queried
from the command line while building.

| Skill | What it decided here |
|---|---|
| `ui-ux-pro-max` | The largest of them: 67 styles, 161 palettes, 57 font pairings, 99 UX rules. Its typography table has a row for exactly this domain — *Financial Trust: banks, finance, insurance, investment, fintech; excellent for data* — and that row chose the typeface. Its priority table (accessibility first, touch targets second) is the checklist the interface was measured against. |
| `design-system` | Three-layer token architecture — primitive → semantic → component. Why `globals.css` has `--surface` and `--faint` rather than a list of greys, and why no component contains a hex value. |
| `design` | Brand identity, icon and logo guidance. The role icons are drawn on a 24 grid at 1.75 stroke because of it. |
| `ui-styling` | Tailwind and shadcn patterns, accessible component recipes, responsive rules. |
| `brand` | Palette management and consistency checklists. |
| `banner-design`, `slides` | Not used here. Kept so the set is whole. |

### What they actually changed

The useful part is not that a rulebook was consulted — it is what happened when the app was
measured against it instead of compared to it. Two failures came out of that pass, both invisible
while using the app on a laptop:

- **Contrast.** The card's own eyebrow labels — `ISSUED BY`, `PERMITS`, sixteen to a screenful —
  measured 4.37:1 against a 4.5:1 requirement. The cause was that `--faint` had been checked once,
  against the page background, and is used on four different surfaces. Both themes moved.
- **Touch targets.** On a 390px viewport, 43 of 49 controls sat under the 44px floor. Every one of
  them is comfortable with a mouse, which is precisely why none had been noticed.

Both are written up in [`../docs/DECISIONS.md`](../docs/DECISIONS.md) with the numbers, and both
were fixed and re-measured to zero.

### Using them

```bash
py -3 tools/skills/ui-ux-pro-max/scripts/search.py "listing card marketplace" --domain product
py -3 tools/skills/ui-ux-pro-max/scripts/search.py "contrast focus touch target" --domain ux
```

The agent loads its own copy from `.claude/skills/`, which is gitignored — this folder is the
readable one.

---

## Where the rest of the reasoning lives

| Document | What it holds |
|---|---|
| [`../README.md`](../README.md) | How to run it, what to click, the short version of every decision |
| [`../docs/DECISIONS.md`](../docs/DECISIONS.md) | The long version: every decision that was not obvious, with the measurement that settled it |
| [`../supabase/SECURITY.md`](../supabase/SECURITY.md) | The access-control model, and the two holes an adversarial review found in it |
| [`../supabase/CURRENT_STATE.sql`](../supabase/CURRENT_STATE.sql) | What is actually in the database right now — tables, policies, functions, triggers — read out of the live instance rather than assembled from the migrations |
