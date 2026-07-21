# @servvo/connector-core

The `RestaurantConnector` contract plus everything every adapter shares: the HTTP
client (retries, timeouts, rate-limit awareness), the vendor registry, and capability
advertising.

This package is a large slice of the reusable ~40% — a new vertical inherits all of it.

**Adapters are thin.** A connector knows its vendor's endpoints, auth shape, ids, and
field mappings — nothing about MCP, tenancy, or guardrails. Importing `@servvo/policy`
into an adapter is a design error.

`capabilitiesOf()` drives the exposed MCP surface: never advertise a tool a vendor
cannot back. A stubbed method returning fake data is worse than an absent one — the
agent will confidently report fiction.
