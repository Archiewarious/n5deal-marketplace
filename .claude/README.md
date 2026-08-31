# Design skills and hooks

Copied from `~/Desktop/amazon/front/.claude` on 31.08.2026, at the owner's instruction, so this
project uses the same design methodology as his other one rather than my improvisation.

## Skills

| Skill | What it is for here |
|---|---|
| `ui-ux-pro-max` | 67 styles, 161 palettes, 57 font pairings, 99 UX rules, 25 chart types. The typography table is what chose IBM Plex Sans for this app: row 31, "Financial Trust", *banks, finance, fintech, enterprise — excellent for data*. |
| `design` | Brand identity, tokens, logos, icons, banners |
| `design-system` | Three-layer token architecture (primitive → semantic → component), component specs |
| `ui-styling` | shadcn/ui and Tailwind patterns, accessible components |
| `brand` | Palette management, typography specs, consistency checklists |
| `banner-design`, `slides` | Not used here; carried over so the set is complete |

## Hooks

`settings.json` wires five of them. The one that matters for design work is
`require-design-skill.js`: editing a UI file without having opened the design skill in that
session produces a reminder. It exists because the skills sat in the other project unused and a
redesign went four rounds — which is exactly what happened here too before they were copied in.

Skills register when a session starts, so they are available from the next session, not this one.
