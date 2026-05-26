# CargoTP Design Prompt

Use this prompt when redesigning or polishing the CargoTP dashboard, static surface, or React UI.

## Core Task

Design a premium dark operational dashboard for a sales team. The product is not a marketing page and not a generic SaaS template. It is a working tool for daily control of sales pace, plan execution, client penetration, group performance, debt pressure, and task follow-up.

The UI must feel calm, expensive, focused, and useful under real work pressure.

## Product Context

CargoTP is a sales control dashboard built around:

- month pace vs plan
- group plan execution
- filtered sales analytics
- client-level opportunities and risks
- receivables pressure
- task management tied to operational actions

There are two surfaces that must stay visually and structurally aligned:

- React / Next.js UI
- static production surface in `index.html`

Do not design them as separate products.

## Visual Direction

- Dark premium operational interface
- No gradients anywhere
- No flashy neon look
- No glossy cards
- No soft consumer app aesthetic
- Flat color only
- Soft RGB accents are allowed, but restrained
- Calm contrast, careful spacing, thin borders, layered dark surfaces

Preferred accent logic:

- blue for neutral actions and active states
- teal for healthy performance
- amber for warnings and attention
- red or rose for risk, lag, debt, margin pressure
- violet only as a rare secondary accent

## Hard Visual Rules

- Absolutely no gradients in backgrounds, cards, buttons, progress bars, charts, overlays, pills, or hover states.
- Avoid over-glow, blur-heavy effects, and decorative noise.
- Keep shadows subtle and compact.
- Use premium dark surfaces with tonal separation, not colorful backgrounds.
- Typography should feel serious, operational, and readable.
- The result must work well on desktop and mobile.

## Motion And Interaction

Add more polish, but keep it quiet:

- subtle hover lift
- smooth opacity and transform transitions
- soft reveal / entrance animation
- calm active states
- elegant tab switching
- no bouncy motion
- no exaggerated scaling

Every interaction should feel deliberate and expensive.

## Information Architecture

The system should clearly separate these workspaces:

### Dashboard

- month pace
- KPI strip
- plan execution
- group tempo
- PROFIT penetration
- cross-sell gaps
- action insights

### Sales

- cards, charts, table, and analytics blocks must all use the exact same filtered dataset
- search and filters must feel fast and obvious
- filters should be easy to scan and reset

### Group Plan

- tempo percent
- `fact - tempoAmount`
- required per day
- projected completion

### Todo

- separate tab, not inside Sales
- board view
- status switching
- filters
- tags
- client context
- should feel native to the same dashboard system

## Analytics That Must Be Visible

Reflect these consistently in both React and static UI:

- month tempo with elapsed days
- pace delta as `fact - tempoAmount`
- plan minus tempo in percent
- required per day
- projected completion
- cross-sell gaps by client and group
- PROFIT penetration by client
- PROFIT penetration by product group
- PROFIT target is 9%, not 11%

## Icon Direction

Add more icons across the product, but use them as operational signals, not decoration.

Use icons in:

- sidebar navigation
- mobile navigation
- KPI cards
- warnings and insights
- group plan metrics
- todo tags and statuses
- search, filters, reset, sort, quick actions
- empty states

Icon style requirements:

- thin or medium-weight line icons
- consistent family and stroke
- compact sizing
- quiet contrast
- no cartoon look
- no oversized hero icons
- icons should improve scan speed and reduce reading effort

Possible icon mapping:

- Dashboard: grid / activity
- Sales: bar chart / briefcase / trend
- Group Plan: layers / boxes / target
- Todo: check-square / kanban / clipboard
- Receivables: wallet / alert-circle
- Settings: sliders / gear
- Tempo: gauge / timer
- Profit: percent / shield
- Cross-sell: network / link
- Risk: alert triangle
- Opportunity: spark but subtle, or target

## UX Priorities

- Search and dropdowns must always render above surrounding blocks.
- Check z-index, stacking context, and overflow clipping.
- Filters should never feel detached from the visible dataset.
- Empty states must be explicit and useful, with no fake data.
- User should instantly understand:
  - where we are behind
  - what is causing it
  - what to do next

## Output Expectation

Produce a design direction and UI refinements for CargoTP that feel like a serious internal sales operating system:

- restrained
- premium
- dark
- flat-color
- analytics-first
- task-oriented
- polished with subtle motion
- richer in icons
- fully aligned between React and static `index.html`

If proposing screens or components, keep them practical and grounded in real sales workflow rather than visual experimentation for its own sake.
