import { z } from "zod"

const CallerSchema = z.object({
  service: z.string().min(1),
  secret: z.string().min(32),
  eventsUrl: z.string().url(),
  returnUrl: z.string().url(),
  phonepeEnv: z.enum(["sandbox", "production"]),
})

export type CallerConfig = Readonly<z.infer<typeof CallerSchema>>

const EnvSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(47430),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  PHONEPE_CLIENT_ID: z.string().min(1),
  PHONEPE_CLIENT_SECRET: z.string().min(1),
  PHONEPE_CLIENT_VERSION: z.string().regex(/^[1-9][0-9]*$/u),
  PHONEPE_MERCHANT_ID: z.string().min(1),
  PHONEPE_CALLBACK_USERNAME: z.string().min(1),
  PHONEPE_CALLBACK_PASSWORD: z.string().min(1),
  PHONEPE_API_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),

  PAYMENT_PUBLIC_ORIGIN: z.string().url(),
  PAYMENT_CALLERS: z.string().min(1),

  EVENT_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
  REPLAY_WINDOW_SECONDS: z.coerce.number().int().min(30).max(600).default(300),
  MAINTENANCE_STATE: z.enum(["NORMAL", "PAYMENTS_DRAINING", "MAINTENANCE", "RECONCILING"])
    .default("NORMAL"),
})

export type ServiceConfig = Readonly<{
  host: string
  port: number
  logLevel: z.infer<typeof EnvSchema>["LOG_LEVEL"]
  phonepe: Readonly<{
    clientId: string
    clientSecret: string
    clientVersion: string
    merchantId: string
    callbackUsername: string
    callbackPassword: string
    requestTimeoutMs: number
  }>
  publicOrigin: string
  returnPath: string
  callbackPaths: Readonly<{ payment: string; subscription: string }>
  callers: ReadonlyMap<string, CallerConfig>
  eventDeliveryTimeoutMs: number
  replayWindowSeconds: number
  maintenanceState: z.infer<typeof EnvSchema>["MAINTENANCE_STATE"]
}>

const exactOrigin = (value: string, name: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL`)
  }
  if (url.protocol !== "https:") throw new Error(`${name} must be https`)
  if (url.origin !== value) throw new Error(`${name} must be a bare origin with no path`)
  return url.origin
}

const safeDestination = (value: string, name: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL`)
  }
  if (url.protocol !== "https:") throw new Error(`${name} must be https`)
  if (url.username !== "" || url.password !== "") throw new Error(`${name} must not embed credentials`)
  if (url.hash !== "") throw new Error(`${name} must not contain a fragment`)
  return url.toString()
}

const APP_RETURN_PATH = "/pay/return"

const appReturnUrl = (configuredUrl: string, name: string): string =>
  new URL(APP_RETURN_PATH, new URL(safeDestination(configuredUrl, name)).origin).toString()

const parseCallers = (raw: string, replayName: string): ReadonlyMap<string, CallerConfig> => {
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    throw new Error(`${replayName} must be a JSON array of caller descriptors`)
  }
  const callers = z.array(CallerSchema).min(1).parse(decoded)
  const map = new Map<string, CallerConfig>()
  for (const caller of callers) {
    if (map.has(caller.service)) throw new Error(`${replayName} declares ${caller.service} twice`)
    map.set(caller.service, Object.freeze({
      ...caller,
      eventsUrl: safeDestination(caller.eventsUrl, `${caller.service}.eventsUrl`),
      returnUrl: appReturnUrl(caller.returnUrl, `${caller.service}.returnUrl`),
    }))
  }
  return map
}

export const loadConfig = (source: NodeJS.ProcessEnv = process.env): ServiceConfig => {
  const parsed = EnvSchema.parse(source)
  return Object.freeze({
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    phonepe: Object.freeze({
      clientId: parsed.PHONEPE_CLIENT_ID,
      clientSecret: parsed.PHONEPE_CLIENT_SECRET,
      clientVersion: parsed.PHONEPE_CLIENT_VERSION,
      merchantId: parsed.PHONEPE_MERCHANT_ID,
      callbackUsername: parsed.PHONEPE_CALLBACK_USERNAME,
      callbackPassword: parsed.PHONEPE_CALLBACK_PASSWORD,
      requestTimeoutMs: parsed.PHONEPE_API_TIMEOUT_MS,
    }),
    publicOrigin: exactOrigin(parsed.PAYMENT_PUBLIC_ORIGIN, "PAYMENT_PUBLIC_ORIGIN"),
    returnPath: "/payment-return",
    callbackPaths: Object.freeze({
      payment: "/api/v1/provider-events/phonepe/payment",
      subscription: "/api/v1/provider-events/phonepe/subscription",
    }),
    callers: parseCallers(parsed.PAYMENT_CALLERS, "PAYMENT_CALLERS"),
    eventDeliveryTimeoutMs: parsed.EVENT_DELIVERY_TIMEOUT_MS,
    replayWindowSeconds: parsed.REPLAY_WINDOW_SECONDS,
    maintenanceState: parsed.MAINTENANCE_STATE,
  })
}
