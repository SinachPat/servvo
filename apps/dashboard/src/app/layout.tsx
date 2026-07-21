/**
 * Root layout. The two Astryx CSS imports are REQUIRED — without them every component
 * renders unstyled. The Theme provider supplies the token values that all component
 * styling resolves against.
 *
 * Brand colors live in the theme, never in components. See
 * .claude/skills/servvo-ui-design/SKILL.md §4.
 */
import type { ReactNode } from "react";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Servvo",
  description: "Connect once. Run every location.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
