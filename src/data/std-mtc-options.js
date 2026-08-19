// KT 系统当地 STD MTC 用车选项（按城市码）——供「当地独立用车」场景选择：
// 离境日（THROUGH COACH 段之外的最后一天）有半天行程 + 送机 → 从该城选项里选
// `{城市} - APT - X HOURS`（如 Rome - APT - 05 HOURS = 5 小时用车后送机）；
// 纯送机（无白天活动）→ `{城市} - HTL/APT`。
// 小时数凭经验选择，一般多留 buffer（默认 05 HOURS，可配置）。
// 用户提供（2026-08-19）：罗马 36 项。后续其他城市按 KT 系统补充。
export const STD_MTC_OPTIONS = {
  ROM: [
    'Rome - 02 HOURS',
    'Rome - 03 HOURS',
    'Rome - 04 HOURS',
    'Rome - 05 HOURS',
    'Rome - 07 HOURS (90 KM)',
    'Rome - 09 HOURS (170 KM)',
    'Rome - 11 HOURS',
    'Rome - 12 HOURS (470 KM)',
    'Rome - ADD HOUR',
    'Rome - APT - 04 HOURS',
    'Rome - APT - 05 HOURS',
    'Rome - APT - 06 HOURS',
    'Rome - APT - 07 HOURS',
    'Rome - APT - 07 HOURS (100 KM)',
    'Rome - APT - 08 HOURS',
    'Rome - APT - 10 HOURS',
    'Rome - APT - 11 HOURS',
    'Rome - APT - 12 HOURS',
    'Rome - APT - 12 HOURS (120 KM)',
    'Rome - APT/HTL',
    'Rome - APT/HTL - TO/FROM FIANO ROMANO-POMEZIA',
    'Rome - DRIVER TIPS - FULL DAY',
    'Rome - DRIVER TIPS - HALF DAY',
    'Rome - EARLY/NIGHT SUPP',
    'Rome - HTL - STA/PIER',
    'Rome - HTL/APT',
    'Rome - HTL/APT - TO/FROM FIANO ROMANO-POMEZIA',
    'Rome - OWT - ROM - FLR/NAP/SORR',
    'Rome - OWT (D/SHOW/CONCERT)',
    'Rome - RTN TRF',
    'Rome - STA/PIER - 05 HOURS',
    'Rome - STA/PIER - 05 HOURS (115 KM)',
    'Rome - STA/PIER - 10 HOURS',
    'Rome - STA/PIER - 10 HOURS (244 KM)',
    'Rome - STA/PIER - 12 HOURS (110 KM)',
    'Rome - STA/PIER - HTL',
  ],
}

// 当地用车默认选项：离境日有半天行程时选「APT - X HOURS」（X 凭经验，默认多留 buffer 取 05）
export const DEPARTURE_ACTIVITY_MTC = 'APT - 05 HOURS'
