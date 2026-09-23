// Contract ownership, frozen by M07 §4. Exported as data so producers,
// consumers and audits all read the same statement.

export const WORLD_CONSUMER_CONTRACT_VERSION = "1.0" as const

export interface ContractOwnership {
  contract: string
  owner: "AvatarK Platform"
  producer: string
  consumers: readonly string[]
  authentication: "NONE" | "REQUIRED"
  privacy: "PUBLIC" | "PRIVATE"
  cacheability: string
  worldStateAuthority?: "NONE"
}

export const CONTRACT_OWNERSHIP: readonly ContractOwnership[] = [
  {
    contract: "public-world-projection",
    owner: "AvatarK Platform",
    producer: "AvatarK Platform Living World Host",
    consumers: ["WorldK", "future approved consumer surfaces"],
    authentication: "NONE",
    privacy: "PUBLIC",
    cacheability: "shared/CDN allowed, bounded by freshness.staleAfter",
  },
  {
    contract: "visitor-world-projection",
    owner: "AvatarK Platform",
    producer: "AvatarK Platform World Memory",
    consumers: ["WorldK"],
    authentication: "REQUIRED",
    privacy: "PRIVATE",
    cacheability: "private, no-store on shared caches",
  },
  {
    contract: "world-entry",
    owner: "AvatarK Platform",
    producer: "AvatarK Platform entry resolver (not implemented in M09)",
    consumers: ["WorldK"],
    authentication: "REQUIRED",
    privacy: "PRIVATE",
    cacheability: "never cached",
  },
  {
    contract: "streamk-worldk-narrative-context",
    owner: "AvatarK Platform",
    producer: "StreamK (source); handoff semantics shared with the consumer",
    consumers: ["WorldK"],
    authentication: "NONE",
    privacy: "PUBLIC",
    cacheability: "n/a",
    worldStateAuthority: "NONE",
  },
]
