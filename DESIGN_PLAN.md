# CargoTP Design Plan

## Direction

- Base visual style: dark, restrained, operational interface for daily sales work.
- Accent system: soft RGB accents without gradients.
- Main principle: analytics should show where performance is slipping, and tasks should turn those signals into action.
- The UI should feel focused, not decorative: large surfaces, thin borders, calm hover states, high readability.

## Visual Rules

- No gradients in backgrounds, buttons, progress bars, overlays, or charts.
- Use a near-black background with slightly warmer dark surfaces.
- Use a single accent per element, but allow different RGB accents across the system:
  - blue for neutral primary actions
  - teal for healthy dynamics
  - amber for attention
  - red/pink for risk
  - violet only as a secondary niche accent
- Cards should rely on border, spacing, and elevation instead of glow-heavy styling.
- Motion should stay soft:
  - lift on hover
  - subtle fade/slide on reveal
  - gentle border-color and shadow transitions
  - no flashy transforms

## Product Structure

### Dashboard

- KPI strip
- month pace with elapsed days
- pace variance vs plan
- group pace overview
- PROFIT penetration blocks
- cross-sell gaps
- action insights with direct follow-up ideas

### Sales

- filters and search
- synced charts and table from the same filtered dataset
- quick operational widgets:
  - risky margin/discount rows
  - debt pressure on visible clients
  - clients for cross-sell expansion
- CTA into the Todo workspace

### Todo

- separate tab
- board view with `To do / In progress / Done`
- filters by search, priority, status, tag
- quick add
- suggestions generated from analytics
- each task should support client context, tags, and business reason

### Groups

- plan share
- pace amount
- pace completion in percent
- `fact - tempoAmount`
- required per day until month end
- projection to month end

### Clients

- next step candidate for future phase
- should combine:
  - PROFIT penetration
  - missing groups
  - debt risk
  - margin pressure

## Actionable Analytics To Emphasize

- Month pace by elapsed days.
- Group underperformance as `fact - tempoAmount`.
- Group pace completion in percent.
- Required daily run-rate to recover plan.
- Cross-sell gaps where a client buys only part of the target matrix.
- PROFIT penetration by clients.
- PROFIT penetration by product groups.
- Clients where turnover exists but PROFIT is absent.
- Clients where discount pressure destroys margin.
- Overdue debt tied to visible sales activity.

## UX Principles

- Every critical block should answer one of three questions:
  - where are we behind
  - why is it happening
  - what should be done next
- Search and filter menus must always appear above surrounding blocks.
- Empty states must stay useful and explicit, never synthetic.
- Tables, charts, and KPI cards must always reflect the same filtered slice.

## Implementation Plan

### Phase 1

- Sync React surface and static `index.html`.
- Remove all remaining gradients.
- Fix overlay stacking for search suggestions and table filter menus.
- Move Todo into a separate tab.
- Align PROFIT target to 9%.

### Phase 2

- Expand dashboard with month pace, group pace, penetration, and cross-sell signals.
- Improve group plan table with pace percent and pace delta.
- Add soft animations and hover polish across major surfaces.

### Phase 3

- Add richer task detail and relation to client/group/business issue.
- Add a dedicated client performance workspace.
- Add prioritization by expected impact on plan, PROFIT, and debt control.
