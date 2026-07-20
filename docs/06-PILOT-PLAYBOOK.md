# Servvo — 90-Day Pilot Playbook

**The bar (non-negotiable, from the product doc):** 5 pilot brands · ≥95% connector
uptime · <30-minute setup · real recurring agent usage · ≥1 publishable case study.
Falling short sends the connector templates back for another pass **before** a second
vertical opens.

---

## 1. The pilot offer

| Term | Detail |
|------|--------|
| Price | Free for 90 days, then 50% off year one if they convert |
| In exchange | Weekly 20-min feedback call · usage instrumentation consent · a named, quotable case study on success · 2 referral intros if the pilot hits its goals |
| Scope | Up to all locations, read tools + opt-in writes per the balanced guardrails |
| Out | Custom connectors, SLA guarantees, invoicing integrations (that's enterprise later) |
| Exit | Either side can end with 1 week's notice; their data/tokens revoked + purged on exit |

Put it on one page. Operators sign one-pagers; they stall on 12-page MSAs.

## 2. Recruitment (via consultants)

1. List 10 franchise consultants / operator advisors from discovery-interview referrals.
2. Consultant pitch: "Bring 2 brands; you look ahead-of-the-curve, they get it free,
   you get first white-label rights when we open the partner program."
3. Cluster deliberately: pick pilots on the **same stacks** (the discovery matrix tells
   you which) so one connector fix helps all five.
4. Backstop: the 5+ operators who gave calendar-level commitments in discovery.

## 3. Onboarding runbook (white-glove, but scripted for repeatability)

**Before the call:** confirm their vendors + location count; pre-create the brand;
check vendor partner/sandbox access covers them.

**The 30-minute call (screen-share, timed — this *is* the setup-time metric):**
1. 0–5 min — operator signs in, names the brand.
2. 5–15 min — connects each system via OAuth (they click; you narrate).
3. 15–20 min — selects live locations; reviews guardrail defaults *out loud*
   ("your agent can read everything; it cannot touch money unless you flip this").
4. 20–25 min — paste the MCP config into their agent (Claude Desktop or ours).
5. 25–30 min — **the first-query moment:** "ask it which store had the best night
   last week." Do not end the call before they've asked one real question and gotten
   a correct answer. That moment is the product.

**After:** send a 5-prompt starter sheet tailored to what they said they care about
in discovery. Log actual elapsed setup time.

## 4. Weekly cadence

**Per-brand weekly check-in (20 min):** what did you ask it · what did it get wrong ·
what did you *stop* asking it (silence = churn signal) · one thing to add.

**Internal weekly pilot review:** uptime per connector · time-to-first-successful-call
per brand · weekly active agent calls per brand · tool-call success rate · denied-write
log review (are guardrails annoying or saving?) · incident postmortems.

**Instrumentation (must exist before pilot start — Prompts 6/12):** per-brand usage
dashboards, connector health alerts to your phone, and the audit stream as the single
source of truth.

## 5. Incident protocol

- Detect before the operator does (health checks + alerting).
- Notify affected pilots within 1 hour with plain-English status; no jargon, no spin.
- Postmortem in the weekly review; fix goes to the connector *template* so all brands
  benefit — this is the "templates go back for another pass" loop working as designed.

## 6. Case-study capture

Collect **as you go**, not at the end: verbatim quotes from weekly calls · a
before/after workflow ("Monday reporting: 3 hours → one question") · one hard number
(hours saved, a caught labor spike, a stockout avoided). At day 75, draft the case
study and get written approval for name + logo use. This is the sales asset for
everything in the GTM playbook.

## 7. Day-90 gate

| Result | Action |
|--------|--------|
| Bar met on all four measures | Convert pilots to paid (50%-off yr-1), publish the case study, open GA restaurant sales, greenlight vertical #2 planning |
| Uptime or setup missed | Template rework sprint; extend pilots 30 days free; re-measure. Do **not** start vertical #2 |
| Usage flat (<2 active days/wk per brand by day 45) | The problem is product, not reliability — run 5 "why did you stop asking" interviews before writing more code |
| Pilots churn | Full stop. Back to discovery with the churn interviews as input |
