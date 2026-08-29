import { loadConfig } from "./config/env.js"
import { buildRuntimes } from "./gateways.js"
import { createNonceStore } from "./http/serviceAuth.js"
import { createSessionStore } from "./sessions.js"
import { buildServer, deliverEvent } from "./server.js"

const config = loadConfig()
const runtimes = buildRuntimes(config)

const app = buildServer({
  config,
  runtimes,
  nonces: createNonceStore(config.replayWindowSeconds),
  sessions: createSessionStore(),
  clock: () => new Date(),
  deliver: (runtime, event) => deliverEvent(config, runtime, event),
})

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down")
  await app.close()
  process.exit(0)
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
})
process.on("SIGINT", () => {
  void shutdown("SIGINT")
})

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info(
    { callers: [...runtimes.keys()], maintenanceState: config.maintenanceState },
    "payment service listening",
  )
} catch (error) {
  app.log.error({ err: error }, "failed to start")
  process.exit(1)
}
