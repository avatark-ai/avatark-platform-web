// AVK-DT4H-SETPOINT-01: DT4H / SetpointK terminology correction. STATUS: PROPOSED -- awaiting owner approval.
// Owner clarification (2026-11-08): DT4H = Digital Twin for Health, the modeling layer that initializes, models and
// continuously calibrates human digital twins; SETPOINT (setpointk.ai) is the execution and adaptation system built
// on it. The SetpointK card must not present SETPOINT as owning the DT4H modeling layer. Register:
// _claude_reports/AVK_DT4H_SETPOINT_01/tools/dt4h-register.json. Do not edit a string here without a register
// amendment: dt4hSetpointCopy.test.ts pins every value. No integration claim: "Built on" restates the owner's
// architecture; nothing here links SetpointK to the AvatarK Platform or asserts a live data connection.

export const DT4H_SETPOINT_COPY = {
  "AVK-DS-SP-01": "Execution & Adaptation Engine",
  "AVK-DS-SP-02": "SETPOINT executes adaptive protocols, using model state, trajectory and feedback to guide adaptation.",
  "AVK-DS-SP-03": "Built on DT4H, Digital Twin for Health.",
  "AVK-DS-SEC-01": "Adaptive Execution",
} as const

export type Dt4hSetpointCopyId = keyof typeof DT4H_SETPOINT_COPY

export const DT4H_SETPOINT_COPY_SHA256: Record<Dt4hSetpointCopyId, string> = {
  "AVK-DS-SP-01": "7a8354b4e9268a90c8f54376007966c4b8c6a1e68d425718a818a7f38d44a1cf",
  "AVK-DS-SP-02": "51ab93db292e7c35d252eb669e0c7d516729774d1d7f9f43b1946c3cf148f068",
  "AVK-DS-SP-03": "aef519e387b3015e1647a88e18c5dc27c56f12d6f27a133218e2ad509c04b45f",
  "AVK-DS-SEC-01": "fff05f7f2a1486f0f257a48b61515b9c8629387452de2faabb553b8d42742c0f",
}
