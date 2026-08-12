# QUOS Checklist View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact QUOS checklist table view for efficient cross-reference data entry into the KT/QUOS quoting system.

**Architecture:** A new `quos-list.jsx` panel view renders a compact table (one row per item) with QUOS type codes, country/city codes, and bilingual item names. A shared `quos-mapping.js` library handles type mapping, city-code lookup, attraction English names, and sort-order persistence. City data is precompiled from KT's Cities.xlsx via a one-shot build script.

**Tech Stack:** React (client component), localStorage (sort order + manual overrides), xlsx (build script only)

## Global Constraints

- Cities.xlsx 8000+ rows → precompiled JSON ~500KB, committed to Git
- Table row height ≤ 40px, 15–20 rows visible per screen
- All auto-matched values have manual override (dropdown)
- Dual-theme CSS variables (`var(--bg-*)`, `var(--text-*)`, `var(--border-color)`)
- `npm run build` must pass
- 2-space indentation, single quotes, no semicolons, camelCase vars

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/build-quos-cities.js` | Create | One-shot: read Cities.xlsx + europe-travel.json → write quos-cities.json |
| `src/data/quos-cities.json` | Create | Precompiled lookup: Chinese/English city name → { cityCode, countryCode } |
| `src/data/quos-attractions.json` | Create | Precompiled from 巴黎景点.xlsx: Chinese name → QUOS standard English name |
| `src/lib/quos-mapping.js` | Create | All QUOS logic: type mapping, city lookup, attraction EN name, sort order R/W |
| `src/components/panel-views/quos-list.jsx` | Create | Table component: by-day / by-QUOS-type views, sort settings, dropdowns |
| `src/components/panel-views/day-detail.jsx` | Modify | Add view toggle button (`📋 卡片` / `📊 清单`) in toolbar |
| `src/app/api/parse-itinerary/route.js` | Modify | Add `transportSubtype` field to AI prompt |
| `src/lib/itinerary-store.js` | Modify | Preserve `transportSubtype` in `importItinerary` |

---

### Task 1: Build Script for QUOS Cities JSON

**Files:**
- Create: `scripts/build-quos-cities.js`
- Create: `src/data/quos-cities.json` (generated)
- Create: `src/data/quos-attractions.json` (generated)

**Interfaces:**
- Produces: `quos-cities.json` — `{ "巴黎": { cityCode: "PAR", countryCode: "FR", englishName: "Paris" }, "Paris": { cityCode: "PAR", countryCode: "FR" }, ... }`
- Produces: `quos-attractions.json` — `{ "埃菲尔铁塔": "EIFFEL TOWER", "卢浮宫": "LOUVRE", ... }`

- [ ] **Step 1: Write `scripts/build-quos-cities.js`**

```js
// scripts/build-quos-cities.js
// One-shot build: node scripts/build-quos-cities.js
// Reads KT Cities.xlsx + euro-travel.json → outputs quos-cities.json
// Reads KT 巴黎景点.xlsx → outputs quos-attractions.json

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const CITIES_PATH = '/Users/michael/Projects/KT/系统拷贝列表/Cities.xlsx'
const ATTRACTIONS_PATH = '/Users/michael/Projects/KT/系统拷贝列表/巴黎景点.xlsx'
const TRAVEL_DATA_PATH = path.join(__dirname, '../src/data/europe-travel.json')
const OUT_CITIES = path.join(__dirname, '../src/data/quos-cities.json')
const OUT_ATTRACTIONS = path.join(__dirname, '../src/data/quos-attractions.json')

// ---- Build quos-cities.json ----
function buildCities() {
  const wb = XLSX.readFile(CITIES_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // data[0] = ['Link', null, 'City Name', 'City Code', 'Phone Prefix', 'Latitude', 'Longitude', 'City ID', 'Country Code']
  // Valid city rows: col 2 (City Name) and col 3 (City Code) both present and not "TO BE DELETED"

  const lookup = {}

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const cityName = row[2]
    const cityCode = row[3]
    const countryCode = row[8]

    if (!cityName || !cityCode) continue
    if (cityName === 'TO BE DELETED' || cityCode === 'TO BE DELETED') continue
    if (!countryCode || countryCode.length !== 2) continue

    // Index by English name
    lookup[cityName] = { cityCode, countryCode }
  }

  // Cross-reference with europe-travel.json for Chinese name mapping
  const travelData = JSON.parse(fs.readFileSync(TRAVEL_DATA_PATH, 'utf-8'))
  let chineseMatchCount = 0

  for (const country of travelData.countries) {
    for (const city of country.cities) {
      if (city.nameEn && lookup[city.nameEn]) {
        // Chinese name → same data
        lookup[city.name] = lookup[city.nameEn]
        chineseMatchCount++
      }
    }
  }

  console.log(`quos-cities.json: ${Object.keys(lookup).length} keys (${chineseMatchCount} Chinese names matched)`)
  fs.writeFileSync(OUT_CITIES, JSON.stringify(lookup, null, 2))
}

// ---- Build quos-attractions.json ----
function buildAttractions() {
  if (!fs.existsSync(ATTRACTIONS_PATH)) {
    console.log('巴黎景点.xlsx not found, writing empty quos-attractions.json')
    fs.writeFileSync(OUT_ATTRACTIONS, '{}')
    return
  }

  const wb = XLSX.readFile(ATTRACTIONS_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // data[0] = ['原文名称', '标准中文译名', '景点简介（行程游览用途）']
  const lookup = {}

  for (let i = 1; i < data.length; i++) {
    const originalName = data[i][0]   // e.g. "EIFFEL TOWER"
    const chineseName = data[i][1]    // e.g. "埃菲尔铁塔"
    if (originalName && chineseName) {
      lookup[chineseName] = originalName
    }
  }

  console.log(`quos-attractions.json: ${Object.keys(lookup).length} entries`)
  fs.writeFileSync(OUT_ATTRACTIONS, JSON.stringify(lookup, null, 2))
}

// ---- Run ----
buildCities()
buildAttractions()
console.log('Done.')
```

- [ ] **Step 2: Run the build script**

```bash
node scripts/build-quos-cities.js
```

Expected output:
```
quos-cities.json: ~8300 keys (33 Chinese names matched)
quos-attractions.json: 17 entries
Done.
```

- [ ] **Step 3: Verify generated files exist**

```bash
ls -lh src/data/quos-cities.json src/data/quos-attractions.json
```

Expected: both files present, quos-cities.json ~400-600KB

- [ ] **Step 4: Commit**

```bash
git add scripts/build-quos-cities.js src/data/quos-cities.json src/data/quos-attractions.json
git commit -m "feat: add QUOS cities/attractions data build script and precompiled JSON"
```

---

### Task 2: QUOS Mapping Library

**Files:**
- Create: `src/lib/quos-mapping.js`

**Interfaces:**
- Produces: `getQUOSType(item)` → `{ code: string, label: string }`
- Produces: `getCityCode(cityName)` → `{ cityCode: string, countryCode: string } | null`
- Produces: `getAttractionNameEn(chineseName)` → `string`
- Produces: `getQUOSOrder()` → `string[]` (12 codes)
- Produces: `saveQUOSOrder(order: string[])` → `void`
- Produces: `DEFAULT_QUOS_ORDER` — `string[]`
- Produces: `QUOS_LABELS` — `{ [code]: string }`

- [ ] **Step 1: Write `src/lib/quos-mapping.js`**

```js
'use client'

import quosCities from '@/data/quos-cities.json'
import quosAttractions from '@/data/quos-attractions.json'

// ---- QUOS Type Definitions ----
export const DEFAULT_QUOS_ORDER = [
  'HTL', 'MTC', 'ENT', 'RST', 'GUI',
  'FLT', 'DTR', 'OTR', 'DFR', 'OFR',
  'LUG', 'OTH',
]

export const QUOS_LABELS = {
  HTL: 'Hotel',
  MTC: 'Motor Coach',
  ENT: 'Entrance',
  RST: 'Restaurant',
  GUI: 'Guide',
  FLT: 'Flight',
  DTR: 'Day Train',
  OTR: 'Overnight Train',
  DFR: 'Day Ferry',
  OFR: 'Overnight Ferry',
  LUG: 'Luggage',
  OTH: 'Others',
}

const QUOS_ORDER_KEY = 'euro-quos-order'

// Map generic item type (+ transportMode/transportSubtype) to QUOS code
export function getQUOSType(item) {
  const type = item.type

  if (type === 'hotel') return { code: 'HTL', label: 'Hotel' }
  if (type === 'attraction') return { code: 'ENT', label: 'Entrance' }
  if (type === 'breakfast' || type === 'lunch' || type === 'dinner') return { code: 'RST', label: 'Restaurant' }

  if (type === 'transport') {
    const mode = item.transportMode || ''
    const subtype = item.transportSubtype || ''

    if (mode === 'flight') return { code: 'FLT', label: 'Flight' }
    if (mode === 'train') {
      if (subtype === 'overnight') return { code: 'OTR', label: 'Overnight Train' }
      return { code: 'DTR', label: 'Day Train' }
    }
    if (mode === 'boat') {
      if (subtype === 'overnight') return { code: 'OFR', label: 'Overnight Ferry' }
      return { code: 'DFR', label: 'Day Ferry' }
    }
    // bus, car, walk, metro → MTC (Motor Coach / ground transport)
    return { code: 'MTC', label: 'Motor Coach' }
  }

  if (type === 'guide') return { code: 'GUI', label: 'Guide' }
  if (type === 'luggage') return { code: 'LUG', label: 'Luggage' }

  return { code: 'OTH', label: 'Others' }
}

// ---- City Code Lookup ----
export function getCityCode(cityName) {
  if (!cityName) return null
  const entry = quosCities[cityName]
  if (entry) return entry
  // Try trimmed
  return quosCities[cityName.trim()] || null
}

// ---- Attraction English Name (QUOS standard) ----
export function getAttractionNameEn(chineseName) {
  if (!chineseName) return ''
  // Priority 1: KT 巴黎景点.xlsx standard name
  if (quosAttractions[chineseName]) return quosAttractions[chineseName]
  // Priority 2: euro-travel.json entity store (handled by caller in DayDetail)
  // Priority 3: blank
  return ''
}

// ---- Sort Order Persistence ----
export function getQUOSOrder() {
  if (typeof window === 'undefined') return DEFAULT_QUOS_ORDER
  try {
    const raw = localStorage.getItem(QUOS_ORDER_KEY)
    if (raw) {
      const order = JSON.parse(raw)
      // Validate: must be an array of 12 valid codes
      if (Array.isArray(order) && order.length === 12 &&
          order.every(c => DEFAULT_QUOS_ORDER.includes(c))) {
        return order
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_QUOS_ORDER
}

export function saveQUOSOrder(order) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUOS_ORDER_KEY, JSON.stringify(order))
  } catch { /* ignore */ }
}
```

- [ ] **Step 2: Verify `npm run build` passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (no import errors for new files)

- [ ] **Step 3: Commit**

```bash
git add src/lib/quos-mapping.js
git commit -m "feat: add QUOS mapping library (type mapping, city lookup, sort order)"
```

---

### Task 3: AI Prompt — Add transportSubtype

**Files:**
- Modify: `src/app/api/parse-itinerary/route.js`
- Modify: `src/lib/itinerary-store.js`

**Interfaces:**
- Consumes: existing AI prompt structure
- Produces: items now include `transportSubtype` field (one of `'day'`, `'overnight'`, or `''`)

- [ ] **Step 1: Update AI system prompt in `src/app/api/parse-itinerary/route.js`**

In the system prompt JSON structure, change the transport item example from:
```
"type": "attraction/hotel/breakfast/lunch/dinner/transport/other",
```
to add `transportSubtype` in the items array. Add after `"type"`:
```
"transportSubtype": "day/overnight/空 — 仅当 type=transport 时填写。train 区分日间火车(day)和夜火车(overnight)，boat/ferry 区分日间渡轮(day)和夜间渡轮(overnight)，其他留空",
```

And add a new rule after rule 5:
```
5b. 交通方式需要区分 sub-type：
    - 火车：日间行驶为 day（DTR），夜间/卧铺为 overnight（OTR）
    - 渡轮/船：日间为 day（DFR），夜间为 overnight（OFR）
    - 大巴/飞机/步行/地铁不需要此字段
```

- [ ] **Step 2: Update `importItinerary` in `src/lib/itinerary-store.js`**

In the `importItinerary` function, add `transportSubtype` to the item mapping (around line 128, near `transportMode`):

```js
transportMode: item.transportMode || 'bus',
transportSubtype: item.transportSubtype || '',   // <-- add this line
distance: item.distance || null,
```

- [ ] **Step 3: Verify `npm run build` passes**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/parse-itinerary/route.js src/lib/itinerary-store.js
git commit -m "feat: add transportSubtype field for AI parsing and import"
```

---

### Task 4: QUOS Checklist Table Component

**Files:**
- Create: `src/components/panel-views/quos-list.jsx`

**Interfaces:**
- Consumes: `itinerary` (same shape as DayDetail), `onItineraryChange`
- Produces: self-contained view with by-day / by-type toggle, QUOS dropdowns, sort settings

- [ ] **Step 1: Write `src/components/panel-views/quos-list.jsx`**

```jsx
'use client'

import { useState } from 'react'
import { updateItem } from '@/lib/itinerary-store'
import { getQUOSType, getCityCode, getAttractionNameEn, getQUOSOrder, saveQUOSOrder, DEFAULT_QUOS_ORDER, QUOS_LABELS } from '@/lib/quos-mapping'
import { getAllEntities } from '@/lib/entity-store'

// ---- helpers ----
function isFreeItem(item) {
  if (item.costCategory === 'free') return true
  if (item.costCategory === 'paid') return false
  return !item.price || item.price === 0
}

function getItemNameEn(item) {
  // attractions: use QUOS standard first, then entity store
  if (item.type === 'attraction') {
    const quosName = getAttractionNameEn(item.name)
    if (quosName) return quosName
    if (typeof window !== 'undefined') {
      const entities = getAllEntities()
      const match = entities.find((e) => e.type === 'attraction' && e.name === item.name)
      if (match?.nameEn) return match.nameEn
    }
  }
  return ''
}

// ---- QUOS Sort Settings Popup ----
function SortSettings({ order, onSave, onClose }) {
  const [items, setItems] = useState([...order])

  const moveUp = (idx) => {
    if (idx <= 0) return
    const next = [...items]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setItems(next)
  }

  const moveDown = (idx) => {
    if (idx >= items.length - 1) return
    const next = [...items]
    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
    setItems(next)
  }

  const reset = () => setItems([...DEFAULT_QUOS_ORDER])

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl p-4 w-80 max-h-[70vh] flex flex-col"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>QUOS 类型排序</h3>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          拖拽排序暂用按钮代替，调整后点保存
        </p>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 mb-3">
          {items.map((code, idx) => (
            <div
              key={code}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--bg-surface)' }}
            >
              <span className="font-mono font-bold w-8" style={{ color: 'var(--accent)' }}>{code}</span>
              <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{QUOS_LABELS[code]}</span>
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="w-5 h-5 rounded flex items-center justify-center text-xs disabled:opacity-20"
                style={{ color: 'var(--text-tertiary)' }}
              >▲</button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="w-5 h-5 rounded flex items-center justify-center text-xs disabled:opacity-20"
                style={{ color: 'var(--text-tertiary)' }}
              >▼</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            重置默认
          </button>
          <button
            onClick={() => { saveQUOSOrder(items); onSave(items); onClose() }}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main Table ----
export default function QUOSList({ itinerary, onItineraryChange }) {
  const [viewMode, setViewMode] = useState('by-day') // 'by-day' | 'by-type'
  const [hideFree, setHideFree] = useState(true)
  const [showSortSettings, setShowSortSettings] = useState(false)
  const [quosOrder, setQUOSOrder] = useState(getQUOSOrder())

  const refresh = () => {
    const raw = localStorage.getItem('euro-itineraries')
    if (raw) {
      const data = JSON.parse(raw)
      const fresh = data.itineraries?.find((t) => t.id === itinerary.id)
      if (fresh) onItineraryChange(fresh)
    }
  }

  const handleQUOSChange = (dayId, itemId, newCode) => {
    updateItem(itinerary.id, dayId, itemId, { quosOverride: newCode })
    refresh()
  }

  // Build flat item list with day context
  const flatItems = []
  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      if (hideFree && isFreeItem(item)) return
      const autoQUOS = getQUOSType(item)
      const effectiveQUOS = item.quosOverride || autoQUOS.code
      const cityInfo = getCityCode(day.cityName)
      flatItems.push({
        ...item,
        dayNumber: day.dayNumber,
        dayId: day.id,
        cityName: day.cityName,
        cityCode: cityInfo?.cityCode || '',
        countryCode: cityInfo?.countryCode || '',
        cityUnmatched: !cityInfo,
        quosCode: effectiveQUOS,
        quosLabel: QUOS_LABELS[effectiveQUOS] || effectiveQUOS,
        isAutoQUOS: !item.quosOverride,
        nameEn: getItemNameEn(item),
      })
    })
  })

  const renderRow = (row) => (
    <tr
      key={`${row.dayId}-${row.id}`}
      className="border-b text-xs"
      style={{ borderColor: 'var(--border-color)', height: 36 }}
    >
      <td className="px-1.5 py-1 whitespace-nowrap">
        <select
          value={row.quosCode}
          onChange={(e) => handleQUOSChange(row.dayId, row.id, e.target.value)}
          className="px-1 py-0.5 rounded text-xs font-mono font-bold border outline-none"
          style={{
            background: row.isAutoQUOS ? 'var(--bg-surface)' : 'var(--accent-subtle)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            width: 60,
          }}
          title={row.isAutoQUOS ? '自动映射' : '手动覆盖'}
        >
          {quosOrder.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </td>
      <td
        className="px-1.5 py-1 font-mono text-center whitespace-nowrap"
        style={{ color: row.countryCode ? 'var(--text-primary)' : 'var(--danger, #e53e3e)' }}
      >
        {row.countryCode || '--'}
      </td>
      <td
        className="px-1.5 py-1 font-mono text-center whitespace-nowrap"
        style={{ color: row.cityCode ? 'var(--text-primary)' : 'var(--danger, #e53e3e)' }}
      >
        {row.cityCode || '--'}
      </td>
      <td className="px-1.5 py-1 max-w-[200px] truncate" style={{ color: 'var(--text-primary)' }}>
        <span className="font-medium">{row.name}</span>
        {row.nameEn && (
          <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{row.nameEn}</span>
        )}
      </td>
      <td className="px-1.5 py-1 whitespace-nowrap font-mono" style={{ color: 'var(--text-secondary)' }}>
        {row.startTime}
        {row.endTime ? `-${row.endTime}` : ''}
      </td>
      <td className="px-1.5 py-1 text-center whitespace-nowrap">
        {isFreeItem(row) ? (
          <span className="text-xs px-1 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elevated)' }}>免费</span>
        ) : (
          <span style={{ color: 'var(--gold)' }}>
            {row.price > 0 ? `€${row.price}` : '收费'}
          </span>
        )}
      </td>
      <td className="px-1.5 py-1 text-right whitespace-nowrap" style={{ color: 'var(--gold)' }}>
        {row.estimatedCost > 0 ? `¥${row.estimatedCost}` : ''}
      </td>
      <td className="px-1.5 py-1 text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {row.quantity > 0 ? `×${row.quantity}` : ''}
      </td>
      <td className="px-1.5 py-1 max-w-[120px] truncate" style={{ color: 'var(--text-tertiary)' }} title={row.notes}>
        {row.notes}
      </td>
    </tr>
  )

  // Build rows grouped by view mode
  let tableBody
  if (viewMode === 'by-day') {
    tableBody = []
    const sortedDays = [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber)
    sortedDays.forEach((day) => {
      const dayItems = flatItems.filter((it) => it.dayId === day.id)
      // Sort by QUOS order within day
      dayItems.sort((a, b) => quosOrder.indexOf(a.quosCode) - quosOrder.indexOf(b.quosCode))

      const cityInfo = getCityCode(day.cityName)
      tableBody.push(
        <tr key={`sep-${day.id}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={9} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            Day {day.dayNumber} — {day.cityName}
            {cityInfo && (
              <span className="ml-1.5 font-mono font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {cityInfo.cityCode} / {cityInfo.countryCode}
              </span>
            )}
            {!cityInfo && day.cityName && (
              <span className="ml-1.5 font-mono" style={{ color: 'var(--danger, #e53e3e)' }}>
                未匹配城市代码
              </span>
            )}
          </td>
        </tr>,
      )
      if (dayItems.length === 0) {
        tableBody.push(
          <tr key={`empty-${day.id}`}>
            <td colSpan={9} className="px-2 py-3 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              {hideFree ? '本日仅有免费项目' : '暂无项目'}
            </td>
          </tr>,
        )
      } else {
        dayItems.forEach((row) => tableBody.push(renderRow(row)))
      }
    })
  } else {
    // by-type view
    const grouped = {}
    flatItems.forEach((row) => {
      if (!grouped[row.quosCode]) grouped[row.quosCode] = []
      grouped[row.quosCode].push(row)
    })

    tableBody = []
    quosOrder.forEach((code) => {
      const items = grouped[code]
      if (!items || items.length === 0) return
      tableBody.push(
        <tr key={`sep-${code}`} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <td colSpan={9} className="px-2 py-1.5 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
            {code} — {QUOS_LABELS[code]} ({items.length}项)
          </td>
        </tr>,
      )
      items.forEach((row) => tableBody.push(renderRow(row)))
    })
  }

  // Compute column widths for the header colgroup
  const colWidths = [60, 36, 36, 'auto', 72, 52, 56, 32, 90]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setViewMode('by-day')}
              className="px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'by-day' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'by-day' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按天
            </button>
            <button
              onClick={() => setViewMode('by-type')}
              className="px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                background: viewMode === 'by-type' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'by-type' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              按类型
            </button>
          </div>
          <button
            onClick={() => setHideFree(!hideFree)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
              hideFree ? 'border' : ''
            }`}
            style={
              hideFree
                ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                : { background: 'var(--accent)', color: '#fff' }
            }
          >
            <span>{hideFree ? '👁️' : '👁️‍🗨️'}</span>
            <span>{hideFree ? '隐藏免费' : '显示全部'}</span>
          </button>
        </div>
        <button
          onClick={() => setShowSortSettings(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <span>⚙️</span>
          <span>排序设置</span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={typeof w === 'number' ? { width: w } : {}} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)' }}>
            <tr className="border-b text-xs" style={{ borderColor: 'var(--border-color)' }}>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>QUOS</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>国</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>城</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>项目</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>时间</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>收费</th>
              <th className="px-1.5 py-1.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>预估</th>
              <th className="px-1.5 py-1.5 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>量</th>
              <th className="px-1.5 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {hideFree ? '所有项目均为免费项目' : '暂无数据'}
                </td>
              </tr>
            ) : (
              tableBody
            )}
          </tbody>
        </table>
      </div>

      {/* Sort settings modal */}
      {showSortSettings && (
        <SortSettings
          order={quosOrder}
          onSave={(newOrder) => setQUOSOrder(newOrder)}
          onClose={() => setShowSortSettings(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify `npm run build` passes**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panel-views/quos-list.jsx
git commit -m "feat: add QUOS checklist table component with by-day/by-type views"
```

---

### Task 5: Add View Toggle to DayDetail + Wire Into Panel

**Files:**
- Modify: `src/components/panel-views/day-detail.jsx`
- Modify: `src/components/floating-panel.jsx`

**Interfaces:**
- Produces: `DayDetail` toolbar now has `[📋 卡片] [📊 清单]` toggle
- Produces: `FloatingPanel` renders `QUOSList` when `view` is `'quos'`, passes `activeItinerary` as `itinerary` prop

- [ ] **Step 1: Add view toggle to DayDetail toolbar**

In `day-detail.jsx`, the component signature receives a new `viewMode` and `onViewModeChange` prop. But to keep it simpler, instead of multiple nested views inside DayDetail, we add a new panel view `'quos'` to FloatingPanel. The toggle between card and checklist is handled by the panel's existing tab mechanism.

Actually, re-reading the spec more carefully:

> 在 `day-detail.jsx` 顶部工具栏增加视图切换：
> ```
> [📋 卡片] [📊 清单]   👁️隐藏免费  ⇲全部展开
> ```

So the toggle is in the DayDetail toolbar. When user clicks "清单", it switches to QUOSList. This means we need to add a state in DayDetail to flip between the card view and the list view, or make the parent (FloatingPanel) handle it.

Simplest approach: Add a `[📋 卡片] [📊 清单]` toggle in DayDetail's toolbar. When on "清单" mode, render `<QUOSList>` instead of the card-based day list. This keeps changes minimal.

Modify `day-detail.jsx`:

1. Import QUOSList
2. Add `const [tableView, setTableView] = useState(false)` state  
3. In the toolbar (after expandAll button), add the toggle
4. After the toolbar, conditionally render: `tableView ? <QUOSList ... /> : <card-view>`

```jsx
// In imports:
import QUOSList from './quos-list'

// In DayDetail component:
const [tableView, setTableView] = useState(false)

// In toolbar, before the hideFree button:
<div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
  <button
    onClick={() => setTableView(false)}
    className="px-2 py-0.5 text-xs font-medium transition-all"
    style={{
      background: !tableView ? 'var(--accent)' : 'transparent',
      color: !tableView ? '#fff' : 'var(--text-secondary)',
    }}
  >
    📋 卡片
  </button>
  <button
    onClick={() => setTableView(true)}
    className="px-2 py-0.5 text-xs font-medium transition-all"
    style={{
      background: tableView ? 'var(--accent)' : 'transparent',
      color: tableView ? '#fff' : 'var(--text-secondary)',
    }}
  >
    📊 清单
  </button>
</div>

// After toolbar, before day list:
if (tableView) {
  return (
    <div className="p-3">
      {/* Toolbar with toggle, then QUOSList */}
      ...
      <QUOSList itinerary={itinerary} onItineraryChange={onItineraryChange} />
    </div>
  )
}
```

Actually, let me make the toolbar consistent across both views. The card/checklist toggle is on the left, hideFree and expandAll are on the right (expandAll only shows in card mode).

Let me restructure: the toolbar should be shared, and only the content area switches. Let me write the actual edit.

- [ ] **Step 2: Edit `day-detail.jsx`**

Add import at top (line ~3, after other imports):
```jsx
import QUOSList from './quos-list'
```

Add state after `expandAll`:
```jsx
const [tableView, setTableView] = useState(false)
```

In the toolbar (between the view toggle buttons and the hideFree button), add:
```jsx
<div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
  <button
    onClick={() => setTableView(false)}
    className="px-2 py-0.5 text-xs font-medium transition-all"
    style={{
      background: !tableView ? 'var(--accent)' : 'transparent',
      color: !tableView ? '#fff' : 'var(--text-secondary)',
    }}
  >
    📋 卡片
  </button>
  <button
    onClick={() => setTableView(true)}
    className="px-2 py-0.5 text-xs font-medium transition-all"
    style={{
      background: tableView ? 'var(--accent)' : 'transparent',
      color: tableView ? '#fff' : 'var(--text-secondary)',
    }}
  >
    📊 清单
  </button>
</div>
```

After the toolbar div closes (line ~837), add conditional return for table view.

- [ ] **Step 3: Verify `npm run build` passes**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/panel-views/day-detail.jsx src/components/panel-views/quos-list.jsx
git commit -m "feat: add card/checklist view toggle in DayDetail toolbar"
```

---

## Verification Checklist

After all tasks are complete:

1. `npm run build` passes — no import or syntax errors
2. `node scripts/build-quos-cities.js` generates valid JSON files
3. Import an itinerary → open DayDetail → toggle to checklist view
4. By-day view: items grouped under day headers with city codes
5. By-type view: items grouped by QUOS type, sorted per configured order
6. QUOS type dropdown works — changing updates via `quosOverride`
7. Sort settings modal opens, reorder works, saves to localStorage, persists on reload
8. Hide free items toggle works in checklist view
9. Unmatched city codes show red `--` with "未匹配城市代码" note in day header
10. Bilingual names: QUOS standard names from 巴黎景点.xlsx appear, entity store fallback works
