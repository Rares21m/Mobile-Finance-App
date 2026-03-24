# Notification Priority Matrix v1

Data: 2026-03-15
Scope: Sprint 7A

## Obiectiv
Prioritizam notificarile si aplicam cooldown inteligent pentru a reduce spam-ul.

## Prioritati
- `critical`
- `warning`
- `info`

## Cooldown by priority
- `critical`: 4h
- `warning`: 12h
- `info`: 24h

## Dedupe key
Format recomandat: `domain:item:state`
Exemplu bugete: `budget:food:over`

## Comportament
1. Daca nu a expirat cooldown-ul pe `dedupeKey`, notificarea este skip.
2. Daca ruleaza in Expo Go, persistam doar in inbox.
3. In build-uri native, trimitem local notification + persistam in inbox.

## API intern client
- `queuePriorityNotification({ dedupeKey, priority, title, body, type, lang })`
- returneaza `true` cand notificarea a fost emisa/persistata, `false` cand a fost suprimata prin cooldown

## Mapping initial Sprint 7A
- Budget over -> `critical`
- Budget warning -> `warning`
- Insight informational -> `info`

## Guardrails
- Fara flood pe aceeasi categorie/stare
- Inbox ramane sursa istorica (`notifications_inbox_v1`)
- Respectam invariantul de UX: notificari utile, nu zgomot
