# Sprint 4 QA Checklist

Data: 2026-03-15
Owner: Rares
Scope: Advisor + Profile + Onboarding polish + final hardening.

## 1) Advisor UI readability + robust timeout/error

- [x] Assistant replies remain readable with multiline/bullets in EN/RO.
- [x] Typing state appears only while request is pending.
- [x] Timeout error path shown when advisor API exceeds request timeout.
- [x] Network error path shown when internet is unavailable.
- [x] Retry CTA reuses the failed prompt and does not crash.
- [x] Initial suggestions are selectable and sendable.

## 2) Profile regrouping + settings discoverability

- [x] Sections are grouped as Account / Security / Preferences / Support.
- [x] Quick settings row opens Security, Language, Theme flows.
- [x] Edit profile modal saves name/email and shows success/error toast.
- [x] Biometric toggle confirm flow still works and persists.
- [x] Language and theme changes remain persistent after app restart.

## 3) Onboarding copy clarity + strict payload compatibility

- [x] Each step includes clarity hint copy in EN and RO.
- [x] Final save sends payload with exact shape: { goal, incomeRange, priorityCategories }.
- [x] Invalid/partial onboarding state cannot submit final payload.
- [x] Suggested budget generation still works after payload validation.

## 4) Accessibility + localization pass

- [x] Critical pressables have accessibility labels/roles.
- [x] Switch controls have meaningful accessibility labels.
- [x] No missing i18n keys for new Advisor/Profile/Onboarding strings.
- [x] EN/RO copy has no obvious truncation on common mobile widths.

## 5) Full E2E regression + release checks

- [x] Auth login/register + onboarding guard parity check.
- [x] BT/BRD connected account flows unaffected by Sprint 4 changes.
- [x] Budget + transactions + analytics core navigation unaffected.
- [x] No new lint errors in client.
- [x] Smoke pass on Android and iOS main tabs.

## Release Go/No-Go

- [x] GO if all items are checked and no blocker remains.
- [ ] NO-GO if any critical flow fails (auth, onboarding, advisor send/receive, bank sync).
