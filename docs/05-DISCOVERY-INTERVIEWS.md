# Servvo — Operator Discovery Interview Guide

**Goal:** 12 interviews with multi-unit restaurant operators that decide two things:
(1) the exact v1 connector set, and (2) whether $299/mo lands. Everything in Phase 0
of the roadmap hangs on this document being executed well.

**Non-goal:** selling. If you pitch in the first half of an interview, the data is
polluted. Facts about their past and present beat opinions about your future.

---

## 1. Who qualifies (screener)

| Criterion | Bar |
|-----------|-----|
| Locations | 3–50 units under one operating group |
| Role | Owner, principal, or ops lead with buying authority |
| Systems | Uses a cloud POS (Toast/Square/Clover/other) — legacy-only stacks are a "not yet" |
| Geography | US (v1 vendor coverage) |
| Bonus | Mixed stack across locations (the aggregation pain is strongest) |

Recruit via: franchise consultants (1 warm intro → a cluster), operator Facebook/
LinkedIn groups, local restaurant association lists, conference attendee outreach.
Offer: a $100 gift card or a free "AI-readiness snapshot" of their stack — not a demo.

## 2. Interview structure (45 min)

### A. Context (5 min)
- "Walk me through your locations — how many, what concepts, how long?"
- "Who besides you looks at numbers across all stores?"

### B. Stack inventory (10 min) — *fills the matrix below*
- "Location by location: what runs your POS? Scheduling? Reservations? Inventory? Payroll? Loyalty?"
- "Which of those did you choose, and which did you inherit (franchise mandate, acquisition)?"
- "What's the one system you'd never switch off? The one you'd kill tomorrow?"

### C. Pain excavation (15 min) — *past behavior only*
- "Tell me about the last time you needed a number across all stores. What did you actually do, step by step? How long did it take?"
- "When did a store problem (labor spike, item stockout, bad night) surface later than it should have? What did that cost?"
- "Have you ever paid anyone to connect these systems or build a report? What happened?"
- "What did you try that didn't stick? Why?"

### D. AI temperature (5 min)
- "Have you used ChatGPT/Claude for the business? For what?"
- "If an assistant could see your systems, what's the first thing you'd ask it?"
- "What would make you rip it out in week one?" *(listen for: wrong numbers, unauthorized actions, another login)*

### E. Reaction test (10 min) — *only now, show the concept*
- One-sentence pitch + the 3-step connect flow on paper.
- "What would you expect this to cost per month?" *(let them anchor first)*
- Then: "It's $299/month for your whole brand." Watch the face; probe the hesitation.
- "Who else would need to sign off?" "What would you need to see to trust it with write access?"
- Close: "If we get your systems covered, would you be one of five pilot brands this fall?" *(a calendar commitment is signal; "sounds cool" is not)*

## 3. Stack matrix (fill one row per operator)

| Op | Units | POS (by store count) | Scheduling | Reservations | Inventory | Payroll | Would pilot? | WTP reaction |
|----|-------|----------------------|------------|--------------|-----------|---------|--------------|--------------|
| 1 | | | | | | | | |

## 4. Scoring & the decision gate

After 12 interviews, score each candidate vendor:

**Connector priority = (# operators using it) × (API feasibility 1–3) × (pain intensity 1–3)**

- API feasibility: 3 = open OAuth API w/ sandbox; 2 = partner program required; 1 = closed/none.
- Ship the top 3–4. The hypothesis to beat: **Toast + Square + 7shifts**.

**Go/no-go for the pilot phase:**
- ≥8 of 12 describe the cross-location reporting pain unprompted → problem validated.
- ≥5 give a calendar-level pilot commitment → recruitment validated.
- ≥7 accept $299 without a wince (or anchor higher) → pricing validated.
- Top-3 vendors cover ≥70% of interviewed locations → connector set validated.

Any miss → adjust (vertical, pricing, or connector set) before writing more code.

## 5. Field notes discipline

- Record (with consent) or take verbatim quotes — quotes power the landing page and pitch.
- Log every "workaround" story; workarounds are the buying signals.
- Same-day debrief: 3 bullets — surprised me / confirmed / changed my mind.
