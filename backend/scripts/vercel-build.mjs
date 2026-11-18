import { spawnSync } from "node:child_process";

// Production credentials stay inside Vercel. Apply committed migrations before
// the new API can receive traffic; a migration failure aborts the deployment.
const commands =
  process.env.VERCEL_ENV === "production"
    ? ["db:deploy", "generate", "typecheck"]
    : ["generate", "typecheck"];
for (const command of commands) {
  const result = spawnSync("npm", ["run", command], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
