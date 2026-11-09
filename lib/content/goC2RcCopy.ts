// AVK-GO-C2-RC-BUILD: institutional claims accuracy (F-4). STATUS: OWNER-APPROVED (OD-C2-1, Central Command
// AVK-GO-C2-RC-BUILD §4, exact wording). The /ecosystem Platform Services section described a shared identity,
// shared account and cross-product services as if they existed today. No central identity is implemented
// (AVK-AUTH-01: connected products currently sign in separately), so each service now states whether it is
// in development or planned. Navigation and Motion are unchanged (true of this site) and stay in
// components/ecosystem/PlatformServices.tsx. Register: _claude_reports/AVK_GO_C2_RC_BUILD/AVK_GO_C2_RC_COPY_REGISTER.md.
// Do not edit a string here without a register amendment: unificationCopy.test.ts pins every value.
// No SSO, MFA, passkey or availability claim: these are direction statements, not operational ones.

export const GO_C2_RC_COPY = {
  "AVK-RC-PS-00": "The AvatarK Platform is being built as a shared foundation for these products. These are the services it is designed to provide. Connected products currently sign in separately.",
  "AVK-RC-PS-01": "A unified AvatarK identity across products is in development.",
  "AVK-RC-PS-02": "Profile, preferences and privacy controls, planned for the AvatarK account.",
  "AVK-RC-PS-03": "Gated entry between products, planned to be honored consistently.",
  "AVK-RC-PS-04": "Planned: what to do next, based on where you are.",
  "AVK-RC-PS-05": "In development: the continuing record of practice a person carries with them.",
} as const

export type GoC2RcCopyId = keyof typeof GO_C2_RC_COPY

export const GO_C2_RC_COPY_SHA256: Record<GoC2RcCopyId, string> = {
  "AVK-RC-PS-00": "7251cb5da1d6a1c350ad51ecb256396f68f201088791517cc2edff8ef4e6b95f",
  "AVK-RC-PS-01": "2e72be772667ce833c378e66da0bfc4e1a85621feec83238c0dd20efd4f722ad",
  "AVK-RC-PS-02": "d3e2d1ae69ed33b83bbacc6f83347752d8074bae05dcac251db236a898e95724",
  "AVK-RC-PS-03": "1a4ed13138f426ced5854081120bb87d1533f49de0b6b390215fc62111be7a7a",
  "AVK-RC-PS-04": "ff455ec849ff391e5d873af8e88515367d1feff4c8a200db01eb349dd3df0634",
  "AVK-RC-PS-05": "7e5942258547e0f54c90d5193fe73da87de404459add8eda706fe1c0ded8f55e",
}
