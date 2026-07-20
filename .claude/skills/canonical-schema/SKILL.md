---
name: canonical-schema
description: Rules for changing packages/canonical (the canonical restaurant schema) or adding a vertical schema package. Use whenever a task would add, remove, or alter a canonical type or field.
---

# Canonical schema changes

The canonical boundary is the moat: everything above the adapters speaks these types,
and each new vertical reuses the platform because of it. Schema changes are cheap to
make and expensive to unmake — slow down here.

## Before changing anything

1. **Propose first.** State: the field/type, which tool needs it, which vendors can
   supply it, and what adapters must change. A connector PR that silently edits
   canonical types gets split.
2. Prefer **adding an optional field** over changing meaning. Never repurpose an
   existing field's semantics — add a new one and deprecate the old.
3. If only one vendor can supply a field, it's `nullable` with the null case
   documented — not defaulted, not faked.

## Rules

- **Money:** `{ amount: integer minor units, currency: ISO 4217 }`. Zod must reject
  floats. No exceptions, including percentages-of-money (store both operands, not a
  derived float, when precision matters).
- **`source` + `method` on computed metrics:** every adapter documents exactly how it
  produced each canonical figure. If two vendors disagree on a definition (e.g. net
  sales), the difference lives in `method`, visibly — never silently averaged.
- **Nullable vs optional:** `nullable` = the vendor genuinely may not have it
  (coverCount); `optional` = the field may be omitted from a payload. Don't blur them.
- **Dates:** ISO 8601 strings, timezone-explicit; a Location always carries its IANA
  timezone and per-location reporting respects it.
- **IDs:** canonical ids are Servvo's; vendor ids live only in `vendorRefs` mappings.

## Reconciliation duty

Any schema or mapping change re-runs every adapter's fixture reconciliation tests, and
adds fixtures for the new field from each supporting vendor. A canonical field no test
exercises against a real fixture doesn't exist.

## New verticals

A second vertical gets its **own** package (`canonical-salon` etc.) sharing primitives
(Money, Location shape, DateRange) — do not generalize restaurant types into
lowest-common-denominator mush. Shared primitives move to a `canonical-core` only when
two verticals actually need them.
