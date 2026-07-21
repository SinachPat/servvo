# @servvo/canonical

The canonical restaurant schema — **the boundary that makes Servvo work**.

Everything above the adapters speaks these types. Per-vendor adapters are thin
translators into them. This boundary is the ~40%-reuse moat for future verticals:
the control plane, guardrails, audit, MCP tool layer, and dashboard are all written
against canonical types, so a new vertical needs new *adapters*, not a new platform.

Read [`.claude/skills/canonical-schema/SKILL.md`](../../.claude/skills/canonical-schema/SKILL.md)
before changing anything here.

---

## The normalization contract

Every adapter that produces a canonical value **must** obey these rules. They exist
because vendors genuinely disagree about what common restaurant metrics mean, and a
silent disagreement across a mixed Toast + Square estate is a wrong number in front of
an operator.

### 1. Money is integer minor units — always

```ts
{ amount: 1250, currency: "USD" }   // $12.50
```

`Money.amount` is validated with `.int()`. A float is a **validation error**, not a
rounding inconvenience — this is the guard that stops `0.1 + 0.2` reaching a P&L.
Format only at the display edge via `formatMoney()`; never store, compare, or sum
formatted strings. Use `addMoney()` (which refuses mismatched currencies) and
`averageMoney()` (integer-safe) rather than raw arithmetic.

### 2. Every computed metric carries provenance

```ts
provenance: {
  source: "SQUARE",
  method: "sum(order.net_amounts) over orders closed in range, excluding voids"
}
```

`method` must describe the computation precisely enough that a second engineer could
reproduce the number from the vendor's API. It is surfaced to agents and operators, so
when Servvo compares a Toast location against a Square one, the difference in method is
**visible rather than averaged away**. An empty `method` fails validation.

### 3. Null is not zero

`coverCount: null` means "this POS does not report covers." `laborPctOfSales: null`
means "sales for the matching period were unavailable." Never substitute `0` — a zero
is a claim about the business; a null is a claim about the data. The UI renders null
as "—", never as `0`.

### 4. Time is per-location

Every `Location` carries an IANA `timezone`. "Last week" for a chain spanning
Eastern and Central is not one range — resolve day boundaries in each location's own
zone. Timestamps are ISO 8601 with offset.

### 5. Canonical IDs are Servvo's

`Location.id` is a Servvo id. Vendor-specific identifiers (Toast restaurant GUIDs,
Square location ids) live only in `Location.vendorRefs` and never leak into canonical
types the agent sees.

### 6. Partial results are first-class

A mixed estate means one vendor can be down while others answer. `PartialResult<T>`
carries both `results` and `unavailable[]` so a tool can report "8 of 12 locations;
Square is unavailable for 4" instead of failing the whole request. Adapters surface
the failure; they never fabricate a fallback.

---

## Changing this package

Adding an optional field is cheap. Changing the *meaning* of an existing field is not —
it silently invalidates every adapter's mapping and every stored comparison. Propose
first: name the field, the tool that needs it, which vendors can supply it, and which
adapters must change. Then re-run every adapter's reconciliation tests.

New verticals get their **own** package (`@servvo/canonical-salon`) sharing only
primitives (`Money`, `DateRange`). Do not generalize restaurant types into
lowest-common-denominator mush.
