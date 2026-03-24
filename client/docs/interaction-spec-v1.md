# Interaction Spec v1

Data: 2026-03-15
Scope Sprint 1: Toast, Modal/Bottom Sheet foundations

## Obiectiv
Definirea unui comportament unitar pentru interactiuni tranzitorii fara a schimba logica de business.

## Toast
Componenta: client/components/Toast.jsx

### Comportament
- Intrare: slide-in de sus + fade-in.
- Iesire: slide-out de sus + fade-out.
- Dismiss manual: tap pe toast.
- Pozitionare: top safe area + margini laterale consistente.

### Motion tokens
- Fade-in: `tokens.motion.fast`
- Slide-out: `tokens.motion.normal`
- Fade-out: `tokens.motion.fast`

### Semantica vizuala
- `success`: verde semantic
- `error`: rosu semantic
- `info`: accent semantic
- Background si border sunt generate din culoarea semantica cu alpha.

## Bottom Sheet
Componenta: client/components/BottomSheet.jsx

### Comportament
- Deschidere cu `animationType="slide"`.
- Dismiss prin tap pe backdrop.
- Dismiss prin actiunea explicita `Cancel`.
- Handle vizibil in header-ul sheet-ului pentru affordance.

### Sizing variants
- `sm`, `md`, `lg` pentru padding vertical/orizontal.
- Corner radius aliniat la token (`tokens.radius.xl`).

### Layout rules
- Backdrop foloseste `theme.colors.overlay`.
- Sheet foloseste `theme.colors.surface` + `theme.colors.border`.
- Typography pentru action copy foloseste marimi din tokeni.

## Reguli comune
- Interactiuni critice au feedback vizual consistent.
- Stilul este theme-aware (dark/light).
- Nu se modifica flow-uri de autentificare, onboarding, banking sau date financiare.
