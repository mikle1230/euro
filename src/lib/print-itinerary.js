export function openPrintView(itinerary, cities) {
  if (typeof window === 'undefined') return

  const cityMap = {}
  cities.forEach((c) => { cityMap[c.id] = c })

  const groupSize = itinerary.groupSize || 1

  // Calculate costs
  let perPersonTotal = 0
  let perGroupTotal = 0
  itinerary.days.forEach((d) => {
    d.items.forEach((item) => {
      if (!item.price) return
      const qty = item.quantity || 1
      if (item.priceUnit === 'perPerson') perPersonTotal += item.price * qty
      else if (item.priceUnit !== 'included') perGroupTotal += item.price * qty
    })
  })
  const estimatedTotal = perPersonTotal * groupSize + perGroupTotal

  const itemIcons = { attraction: '🏛️', transport: '🚌', hotel: '🏨', breakfast: '🥐', lunch: '🍽️', dinner: '🍷', other: '📌' }
  const typeLabels = { attraction: '景点', transport: '交通', hotel: '住宿', breakfast: '早餐', lunch: '午餐', dinner: '晚餐', other: '其他' }

  const daysHtml = itinerary.days.map((day) => {
    const city = day.cityId ? cityMap[day.cityId] : null
    const itemsHtml = day.items.length === 0
      ? '<p style="color:#999;font-style:italic;margin:4px 0">无项目</p>'
      : day.items.map((item) => {
          const icon = itemIcons[item.type] || '📌'
          let costStr = ''
          if (item.price) {
            const unitLabel = item.priceUnit === 'perPerson' ? '/人' : item.priceUnit === 'perGroup' ? '/团' : item.priceUnit === 'perDay' ? '/天' : ''
            costStr = ` — <strong>€${item.price}${unitLabel}</strong>${item.quantity > 0 ? ` ×${item.quantity}` : ''}`
          }
          return `<div style="margin:3px 0;font-size:13px;padding:2px 0">
            ${icon} ${item.name}${costStr}
            ${item.startTime ? ` <span style="color:#888;font-size:11px">${item.startTime}${item.endTime ? '-' + item.endTime : ''}</span>` : ''}
            ${item.notes ? `<br><span style="color:#888;font-size:11px">${item.notes}</span>` : ''}
          </div>`
        }).join('')

    return `<div style="margin-bottom:16px;page-break-inside:avoid">
      <h3 style="margin:0 0 6px;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px">
        Day ${day.dayNumber} — ${day.cityName || city?.name || '未分配'}
        ${city ? `<span style="font-weight:normal;color:#888;font-size:12px">${city.country?.name || ''}</span>` : ''}
      </h3>
      ${itemsHtml}
    </div>`
  }).join('')

  const dateRange = itinerary.startDate
    ? `${itinerary.startDate}${itinerary.endDate ? ' → ' + itinerary.endDate : ''}`
    : ''

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${itinerary.name} — 行程单</title>
  <style>
    * { box-sizing:border-box;margin:0;padding:0 }
    body { font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#333;padding:20px;max-width:800px;margin:0 auto }
    h1 { font-size:22px;margin-bottom:4px }
    h2 { font-size:16px;color:#666;margin-bottom:16px;font-weight:normal }
    .meta { font-size:12px;color:#888;margin-bottom:20px }
    .meta span { margin-right:16px }
    .summary { display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap }
    .summary-item { background:#f5f5f5;padding:8px 14px;border-radius:8px;text-align:center;min-width:60px }
    .summary-item .num { font-size:20px;font-weight:bold;color:#2563eb }
    .summary-item .label { font-size:11px;color:#888 }
    .cost-box { background:#fef3c7;padding:12px 16px;border-radius:8px;margin-bottom:20px }
    .cost-box .total { font-size:20px;font-weight:bold;color:#d97706 }
    @media print {
      body { padding:10px }
      @page { margin:15mm }
    }
  </style>
</head>
<body>
  <h1>${itinerary.name}</h1>
  ${dateRange ? `<h2>${dateRange}</h2>` : ''}
  <div class="meta">
    ${itinerary.tourCode ? `<span>🏷️ ${itinerary.tourCode}</span>` : ''}
    ${itinerary.groupSize > 0 ? `<span>👥 ${itinerary.groupSize}人</span>` : ''}
    <span>📅 ${itinerary.days.length}天</span>
  </div>

  <div class="summary">
    <div class="summary-item"><div class="num">${itinerary.days.length}</div><div class="label">天数</div></div>
    <div class="summary-item"><div class="num">${new Set(itinerary.days.map(d=>d.cityId).filter(Boolean)).size}</div><div class="label">城市</div></div>
    <div class="summary-item"><div class="num">${itinerary.days.reduce((s,d)=>s+d.items.length,0)}</div><div class="label">项目</div></div>
  </div>

  ${(perPersonTotal > 0 || perGroupTotal > 0) ? `
  <div class="cost-box">
    <div style="font-size:12px;color:#888;margin-bottom:4px">💰 费用估算</div>
    ${perPersonTotal > 0 ? `<div style="font-size:13px">人均: €${perPersonTotal.toFixed(0)}</div>` : ''}
    ${perGroupTotal > 0 ? `<div style="font-size:13px">固定团费: €${perGroupTotal.toFixed(0)}</div>` : ''}
    <div class="total">估算总价: €${estimatedTotal.toFixed(0)} ${itinerary.groupSize > 0 ? `(${itinerary.groupSize}人)` : ''}</div>
  </div>` : ''}

  <h2 style="font-size:16px;color:#333;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:4px">每日行程</h2>
  ${daysHtml}

  <p style="text-align:center;color:#ccc;font-size:11px;margin-top:30px">Euro Atlas · ${new Date().toLocaleDateString('zh-CN')}</p>

  <script>setTimeout(() => window.print(), 400)<\/script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
