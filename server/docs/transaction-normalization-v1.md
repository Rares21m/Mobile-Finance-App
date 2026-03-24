# Transaction Normalization Rules v1

Date: 2026-03-15

## Canonical Identity
Canonical ID hash inputs:
- bankName
- accountId
- amount (fixed 2 decimals)
- currency
- normalized valueDate (fallback bookingDate)
- normalized merchant
- remittance info
- provider transactionId/endToEndId

Hash algorithm: SHA-256

## Merchant Normalization
- Lowercase
- Trim and collapse whitespace
- Remove punctuation
- Remove company suffix noise (srl, sa, ltd, company, shop, store)
- Fallback: unknown

## Date Normalization
- If date is YYYY-MM-DD: keep exact value (timezone-safe)
- If datetime: convert to ISO and keep date segment
- Client parser maps date-only to UTC noon to avoid local timezone drift

## Duplicate Reconciliation
- During each bank sync, transactions are deduped by canonicalId.
- First seen canonicalId is kept, subsequent rows are marked duplicates (or dropped in response payload).
- metadata.sourceHints.duplicatesDropped is returned to client.

## Source Labels
- manual: user-created transactions
- synced: bank-synced payloads
- inferred: reserved for generated/inferred rows
- cached: local demo/mock rows

## Explainability Hooks
Each normalized transaction can include:
- canonicalId
- merchantNormalized
- sourceLabel
- payloadHash
- syncBatchId
- lastUpdatedAt
