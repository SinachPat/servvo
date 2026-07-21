/**
 * Servvo control plane — vendor OAuth flows, token refresh, location sync, health
 * checks, and the human-approval endpoint that mints confirmation tokens.
 *
 * Built out in Prompts 7/8/11/12.
 */

import express, { type Express } from "express";

const app: Express = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "servvo-control-plane", version: "0.1.0" });
});

const port = Number(process.env.PORT ?? 8788);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`servvo control-plane listening on :${port}`));
}

export { app };
