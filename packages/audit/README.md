# @servvo/audit

Append-only record of everything an agent did — allowed, denied, needs-confirmation,
or errored.

This is a **trust feature**, not just compliance: it is how an operator sleeps at night
after enabling writes, and it is the closer in a sales demo. Every tool call writes
exactly one row carrying the policy engine's `DecisionCode`.

Redaction runs before persistence, because the log is rendered in the dashboard —
anything landing here is effectively user-visible. Failing to audit must be loud: a
write that executed but went unrecorded is worse than one that did not run.

Also the metering source of truth for usage-based billing.
