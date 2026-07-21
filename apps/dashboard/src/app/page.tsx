/**
 * Placeholder landing route.
 *
 * Deliberately minimal: the real screens (Connections, Locations, Audit, Guardrails)
 * are built in Prompt 7, and building UI here without first running
 * `npx astryx build "<screen>"` would violate the design standard. See
 * .claude/skills/servvo-ui-design/SKILL.md §1.
 */
export default function Page() {
  return (
    <main>
      <h1>Servvo</h1>
      <p>Connect once. Run every location.</p>
    </main>
  );
}
