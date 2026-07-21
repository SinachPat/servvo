# @servvo/control-plane

Vendor OAuth flows, scheduled token refresh, location sync, connector health checks,
and the human-approval endpoint that mints confirmation tokens for guardrailed writes.

Runs the background jobs (BullMQ) that keep connections `HEALTHY` and flip them to
`EXPIRED` with a dashboard reconnect prompt when refresh fails.

Built out in Prompts 7, 8, 11, and 12.
