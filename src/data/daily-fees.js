// 每日用车杂费（部分城市有）：停车费/许可费等 —— THROUGH COACH 段内命中当天城市则注入。
// 用户口径（2026-08-18）：**不是所有城市都有杂费**，只有表内城市在相应日子注入。
// 金额/备注以 KT 系统录入为准；后续新增城市→在此表补充。
// 匹配：day 的 cityName / cityNameEn / 城市码 任一命中即注入。
export const DAILY_FEES = [
  {
    city: '克鲁姆洛夫', cityEn: 'Cesky Krumlov', code: 'CKV',
    amount: 98.49, currency: 'EUR',
    note: 'PARKING BUS STOP LD IN ADVANCE',
  },
  {
    city: '哈尔施塔特', cityEn: 'Hallstatt', code: 'HSA',
    amount: 117.29, currency: 'EUR',
    note: 'DAY PARKING FEE PAID BY DRIVER',
  },
  {
    city: '萨尔茨堡', cityEn: 'Salzburg', code: 'SZG',
    amount: 95.74, currency: 'EUR',
    note: 'PARKING PERMIT (BOOKED/ PRE PAID BY SUPPLIER)',
  },
]
