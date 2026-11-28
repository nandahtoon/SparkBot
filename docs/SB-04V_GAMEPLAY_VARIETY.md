# V0.3 — Gameplay variety first (SB-04V)
## Evidence and gap
Family acceptance of V0.2 RC2: functional gameplay, map, 20-minute stability, saves and offline all reported PASS. Parent feedback: levels do not feel very distinct. Source confirms that the existing 20 missions share a build → linear track program → optics puzzle loop. Chapter 5 adds scenery and changes route layouts, budgets and hazards, not a new playable objective. Its optical patterns also reuse earlier configurations. More levels alone will not address this feedback.

## Design direction (proposed, not shipped)
Preserve V0.2 mission IDs, save schema and working stable family deployment. Develop V0.3 on separate branch; retain existing modes. Introduce a typed objective layer with explicit win conditions, meaningful player decisions, visual cues and optional hints before adding Chapter 6. Do not imply water physics merely by repainting a land track.

| Work package | New experience | Acceptance |
|---|---|---|
| SB-04V1 objective contract | Distinguish reaching a gate, collecting specified items, powering stations, and repairing a routine | Deterministic pass/fail results, visible progress, legacy mission parity |
| SB-04V2 playable variety prototype | One collection-focused mission and one repair/diagnostic mission with different success conditions | Winning and losing fixtures, accessible objective UI, replay and save regression |
| SB-04V3 environment and interaction | Ocean surface/reef prototypes, interactive surveying with readable controls; currents only if actually modeled | Mobile/touch performance, no hidden cues, distinct visual silhouettes |
| SB-06A Chapter 6 | 21 Tide Survey (collect), 22 Reef Survey (observe/measure), 23 Current Patterns (plan), 24 Ocean Beacon (repair/power) | Four complete playable missions; at least two demonstrably different objective types, real gameplay differences beyond color and track layout |
| SB-06B acceptance | Compare V0.2 and V0.3 in supervised family play | Parent reports differences in actions/choices, child can state goal; no required extra telemetry or child identifiers |

## Release gates
All existing 20 mission route/optics and save compatibility regressions remain green. New objectives must have testable completion and failure, retry without progress loss, touch access, and understandable feedback. Measure 30 FPS target on actual tablet; 20-minute stability and offline checks. Keep stable production untouched while developing. Family approval before stable V0.3. Commercial launch remains HOLD. Chapter 7–10 contingent on the variety prototype and quality gates. Learning transfer and assistance-aware reporting remain separate outstanding work.
