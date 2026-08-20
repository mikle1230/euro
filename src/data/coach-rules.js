// 用车规则集中配置（用户口径 2026-08-19）——改规则只动这里，便于随时更新和丰富。
// 完整规则说明见 docs/coach-rules.md。
export const COACH_RULES = {
  // R3/R4：断开距离阈值（km）——飞机/火车断开时，上机前后行进距离 ≤ 阈值走 R3，> 阈值走 R4
  breakThresholdKm: 400,

  // R3 默认策略（断开 ≤ 阈值时）：
  //   'local-then-ldc' —— a) 断开前城市当地车，落地后开始 THROUGH COACH（普通团默认）
  //   'ldc-continuous' —— b) 断开前直接起 THROUGH COACH 跨断开连续（不换车，适合高端团/客户指定团）
  breakStrategy: 'local-then-ldc',

  // R2：当地车默认小时数（断开后同城停留多天/当地用车，凭经验选择，一般多留 buffer）
  localMtcHours: '05 HOURS',

  // R1：单接机 / 单送机（仅接机/仅送机时的 STD MTC 选项）
  pickupOnly: 'APT/HTL',
  dropoffOnly: 'HTL/APT',
}
