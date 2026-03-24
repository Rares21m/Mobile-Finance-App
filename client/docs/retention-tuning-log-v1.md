# Retention Tuning Log v1

Data: 2026-03-15
Sprint: 7B
Owner: Rares

## Delivered in this pass

1. Monthly close summary
- Monthly close modal consolidat pe Home (rezumat luna anterioara + ajustari buget).
- KPI events:
  - `monthly_close_view`
  - `monthly_close_apply`

2. Re-entry UX (3/7/14 zile)
- Detectie inactivitate pe baza ultimei vizite Home (`reentry_state_v1`).
- Banner contextual:
  - 3 zile: re-activare usoara
  - 7 zile: reset saptamanal
  - 14 zile: restart ghidat
- KPI events:
  - `reentry_banner_view`
  - `reentry_banner_cta`

3. A/B copy tests pentru insight messaging
- Weekly Digest subtitle + fallback CTA in variante A/B.
- Assignare deterministica + persistenta (`insight_copy_ab_v1`).
- KPI events:
  - `insight_copy_variant_view`
  - `insight_copy_variant_click`

4. Relevance tuning pentru insights
- Introducere relevance scoring pe server:
  - prioritate, actionability, potrivire cu profile categories, urgenta pe tip insight.
- Filtrare noise pentru insight-uri slab actionabile.
- Feed limitat la insight-uri cu valoare practica mai mare.

5. Weekly 1 best next action pe Home
- Card dedicat in Home pentru "best next action".
- Fallback stabil daca feed-ul nu are task prioritar.
- KPI event: `best_next_action_click`.

6. Advisor follow-up reminders
- Accept explicit pe follow-up cards in Advisor.
- Persistenta reminder local (`advisor_followup_reminders_v1`).
- Processor pe Home pentru reminder-e due.
- Trimitere prin pipeline cu cooldown (`queuePriorityNotification`).
- KPI events:
  - `advisor_followup_accept`
  - `advisor_followup_reminder_sent`

## Invariant checks
- BT/BRD integration flow: neschimbat.
- Onboarding payload contract: neschimbat.
- Advisor chat endpoint: extins non-breaking, compatibil cu clientul existent.
- Cooldown anti-noise: pastrat si reutilizat pentru follow-up reminders.

## Next optimization ideas
- Introduce holdout group pentru copy test (A/B/Control) daca volumele permit.
- Add retention cohort breakdown (D1/D3/D7/D14) in dashboard intern.
- Optimize best-next-action selection with historical completion signals.
