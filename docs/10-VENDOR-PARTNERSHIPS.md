# Servvo — Vendor API & Partnership Tracker

**Why this doc exists:** vendor partner approvals are the longest external lead time in
the plan and they gate the two things Servvo sells — *multi-location* access and
*write* capability. Start every application in Phase 0, before the code needs it.

**Rules of engagement (bind all connectors):** official APIs only, never scraping ·
request the narrowest scopes the enabled tools need · design every connector for
revocation (a vendor pulling access degrades one connector, not the platform) ·
re-read the partner ToS before shipping any *write* tool against that vendor.

---

## 1. Per-vendor profiles

### Toast
- **Access model:** Partner program (integration partner application). API uses OAuth
  2.0 **client credentials** (`TOAST_MACHINE_CLIENT`); restaurants identified by GUID.
  Multi-restaurant access is granted through the partner relationship — this is the
  gating item for Servvo's core promise.
- **APIs Servvo needs:** Orders (sales summaries, `search_orders`) · Menus
  (`get_menu`, availability for 86ing) · Labor (employees/shifts) · Stock (inventory,
  v1.x) · restaurant/config (location discovery).
- **Watch-outs:** partner review can take weeks-to-months and may require a demo +
  security review (doc 09 is the answer packet); write scopes reviewed more strictly
  than reads; possible partner fees/rev-share terms.
- **Plan B while waiting:** build the adapter against the sandbox; pilot with
  Square-stack brands first.

### Square
- **Access model:** Open developer platform. OAuth 2.0 authorization-code per merchant
  (access + refresh tokens). A published/public app requires Square's app review; App
  Marketplace listing optional but adds distribution.
- **Scopes mapped to tools:** `MERCHANT_PROFILE_READ` (locations) · `ORDERS_READ`
  (sales, search) · `ITEMS_READ`/`ITEMS_WRITE` (menu / 86 / price) · `INVENTORY_READ`
  (v1.x) · labor scopes for shifts where used.
- **Watch-outs:** app review needed before non-sandbox merchants can OAuth in numbers;
  rate limits per token — the core client's token buckets must be tuned per Square's
  published limits.
- **Fastest path:** Square sandbox is self-serve — this is why the build plan starts
  with the Square adapter.

### Clover
- **Access model:** Developer platform + app approval; per-merchant OAuth tokens;
  apps distributed through the Clover App Market.
- **Servvo needs:** merchants/locations · orders · inventory/items (menu + price).
- **Watch-outs:** App Market review has UX/branding requirements even for API-only
  apps; regional platform differences (US vs EU endpoints).

### 7shifts
- **Access model:** Public API with OAuth/API tokens; partner track for deeper access.
- **Servvo needs:** locations · shifts (read + create/update behind guardrails) ·
  wages/labor cost for `get_labor_summary`.
- **Watch-outs:** labor-cost fields may need elevated access; shift *writes* are the
  first scheduling write in the product — confirm partner ToS explicitly allows
  API-driven schedule changes before enabling `create_shift`/`update_shift` for a
  7shifts brand.

### Roadmap vendors (open tracking rows when discovery demands)
OpenTable / Resy (reservations — partner-gated, post-v1) · MarginEdge / xtraCHEF
(inventory & invoices) · Homebase (scheduling alternative) · Olo (ordering).

## 2. Status tracker (update weekly in Phase 0–2)

| Vendor | Program | Applied | Sandbox | Read scopes | Write scopes | Contact | Status / next step |
|--------|---------|---------|---------|-------------|--------------|---------|--------------------|
| Toast | Integration partner | ☐ | ☐ | ☐ | ☐ | — | Apply week 1 — longest lead |
| Square | Developer + app review | ☐ | ☑ self-serve | ☐ | ☐ | — | Build starts here |
| Clover | App Market | ☐ | ☐ | ☐ | ☐ | — | Apply week 2 |
| 7shifts | API / partner | ☐ | ☐ | ☐ | ☐ | — | Confirm write ToS |

## 3. The application packet (reuse for every vendor)

One-pager: what Servvo is + who the customer is · scopes requested and *why each maps
to a named feature* · security summary (token custody, guardrails, audit — lift from
doc 09) · pilot brand count and growth expectations · support contact + incident
process. Vendors approve faster when the reviewer can see you've done their risk
assessment for them.

## 4. Risk register

| Risk | Exposure | Mitigation |
|------|----------|------------|
| Toast partner approval slips past pilot start | Can't serve Toast-stack pilots | Sequence pilots Square-first; keep Toast adapter fixture-tested and ready to flip on |
| A vendor forbids AI-agent-driven writes | Write tools dark for that vendor | Capability advertising already handles per-vendor gaps; sell reads first (most of the value) |
| Vendor launches competing AI access | Positioning pressure | Multi-vendor estates remain Servvo's ground; move fast on cross-POS reasoning |
| API pricing/fee changes | Margin | Usage metering (Prompt 14) passes through; renegotiate at volume |
| Access revoked mid-contract | Customer harm | Revocation-safe design, 1-hour incident comms (doc 06/09), credit policy in ToS |
