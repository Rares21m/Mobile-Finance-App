# Weekly Digest Copy v1

Data: 2026-03-15
Scope: Sprint 7B - Retention Loop + Optimization

## Objective
Testam doua variante de copy pentru mesajele principale din Weekly Digest, fara schimbari de logica financiara.

## A/B Variants

Variant A (control):
- Subtitle: "Ultimele 7 zile, pe scurt"
- CTA fallback: "Revizuiește tranzacțiile recente"

Variant B (experiment):
- Subtitle: "Pulsul financiar săptămânal, într-un minut"
- CTA fallback: "Alege cel mai rapid câștig săptămâna asta"

## Assignment Rule
- Varianta este atribuita deterministic per utilizator.
- Persistenta locala: `insight_copy_ab_v1`.
- Valorile posibile: `A`, `B`.

## Instrumentation
- Impression event: `insight_copy_variant_view`
- Click event: `insight_copy_variant_click`
- Context metadata:
  - `zone`: `weekly_digest`
  - `copyVariant`: `A|B`
  - `weekKey`

## Success Metric
- Primary: CTR pe CTA din digest (`click/view`) per variant.
- Secondary: impact pe `weekly_digest_cta` si pe conversia ulterioara (`insight_conversion`).

## Guardrails
- Fara modificari la payload-urile de onboarding.
- Fara modificari la flow-urile BT/BRD.
- Fara spam: notificari/inbox raman sub cooldown policy existenta.
