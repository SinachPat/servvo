"use client";

import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * TODO(design): replace neutralTheme with the Servvo brand theme once it's compiled:
 *   npx astryx theme add neutral ./packages/ui/theme
 *   # map Ember/Slate Ink/Paper White onto the semantic roles, then:
 *   npx astryx theme build ./packages/ui/theme/servvo.theme.ts
 * Brand hexes belong ONLY in that theme file — never in a component.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <Theme theme={neutralTheme}>{children}</Theme>;
}
