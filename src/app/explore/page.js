'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import FloatingPanel from '@/components/floating-panel'
import DayStrip from '@/components/day-strip'
import SegmentDrawer from '@/components/segment-drawer'
import { getAllCitiesWithCoords, getAllAttractionsFlat } from '@/lib/data'
import { useItineraries, useStoreVersion, addDay } from '@/lib/itinerary-store'
import { ensureSeeded } from '@/lib/entity-store'
import { useIsMobile } from '@/lib/use-is-mobile'
import { buildRoutePlan, routeSignature } from '@/lib/route-plan'
import { buildDayPlans, totalRouteLabel } from '@/lib/day-route'

const MapCore = dynamic(() => import('../../components/map-core'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载地图中...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [cities, setCities] = useState([])
  const [ready, setReady] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 360
    return Math.max(360, Math.min(700, Math.floor(window.innerWidth * 0.5)))
  })
  const isMobile = useIsMobile()
  // 刀3：抽屉当前打开的天（null = 关闭）；行程条高亮跟随它。key 每次打开递增 → 抽屉内部的
  // 「条目展开」状态不跨开关保留（默认折叠）
  const [drawer, setDrawer] = useState(null)
  const drawerKeyRef = useRef(0)
  const drawerDay = drawer?.dayNumber ?? null
  // 刀3：请求右侧面板切视图（{ view, nonce }）—— 只在不影响其默认行为的前提下用
  const [panelViewRequest, setPanelViewRequest] = useState(null)

  // 响应式订阅行程 store：任意 mutation 后自动重渲染，activeId 驱动当前行程
  const { itineraries, activeId } = useItineraries()
  // 版本号：行程 store 每次 commit 递增；用它做派生数据的 memo 依赖。
  // 注意：itinerary 对象是原地 mutate 的（引用稳定），所以派生数据不能依赖对象引用，
  // 必须依赖 version —— 否则 mutation 后 useMemo 不会重算（见 docs/architecture.md）。
  const version = useStoreVersion()

  useEffect(() => {
    setCities(getAllCitiesWithCoords())
    setReady(true)
    // Seed entity store from built-in attraction data
    ensureSeeded(getAllAttractionsFlat)
  }, [])

  const activeItinerary = activeId
    ? itineraries.find((t) => t.id === activeId) || itineraries[0] || null
    : itineraries[0] || null

  // 派生数据 memo 化：仅在行程 store 变更（version 递增）或城市数据就绪时重算。
  // routePoints：地图路线的点集（含天号）；真实里程/几何由 map-core 交给 route-plan.js（OSRM）算。
  const routePoints = useMemo(() => {
    if (!ready || !activeItinerary) return []
    return activeItinerary.days
      .map((d) => {
        const city = cities.find((c) => c.id === d.cityId)
        return city ? { key: d.cityId, lat: city.lat, lng: city.lng, dayNumber: d.dayNumber } : null
      })
      .filter(Boolean)
  }, [version, ready, activeItinerary, cities])

  const itineraryCityIds = useMemo(() => {
    const ids = new Set()
    if (ready && activeItinerary) {
      activeItinerary.days.forEach((d) => { if (d.cityId) ids.add(d.cityId) })
    }
    return ids
  }, [version, ready, activeItinerary])

  const dayLabels = useMemo(() => {
    if (!ready || !activeItinerary) return []
    const cityDayMap = {}
    activeItinerary.days.forEach((d) => {
      if (d.cityId) {
        if (!cityDayMap[d.cityId]) cityDayMap[d.cityId] = []
        cityDayMap[d.cityId].push(d.dayNumber)
      }
    })
    return Object.entries(cityDayMap).map(([cityId, dayNums]) => {
      const city = cities.find((c) => c.id === cityId)
      // 天序号徽章：D3（只待一天）/ D3/D7（行程中出现多天）
      const label = dayNums.length === 1 ? `D${dayNums[0]}` : `D${dayNums.join('/')}`
      return { cityId, label, lat: city?.lat || 0, lng: city?.lng || 0 }
    })
  }, [version, ready, activeItinerary, cities])

  const handleCityClick = useCallback(() => {
    // Called alongside popup display, for reference
  }, [])

  // ---- 刀3：段计划（与 map-core 共用 route-plan 的模块级缓存/并发去重，不会多打一次 OSRM）----
  const [planEntry, setPlanEntry] = useState(null)
  useEffect(() => {
    if (!routePoints || routePoints.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 清掉上一份计划（无可点路线）
      setPlanEntry(null)
      return
    }
    let cancelled = false
    buildRoutePlan(routePoints)
      .then((plan) => { if (!cancelled) setPlanEntry({ signature: plan.signature, plan }) })
      .catch(() => { if (!cancelled) setPlanEntry(null) })
    return () => { cancelled = true }
  }, [routePoints])

  // 签名不匹配 → 计划属于旧点集，宁可不显示数字也不用错几何/错公里
  const routeSig = useMemo(() => routeSignature(routePoints), [routePoints])
  const routePlan = planEntry && planEntry.signature === routeSig ? planEntry.plan : null

  const dayPlans = useMemo(
    () => buildDayPlans({
      startDate: activeItinerary?.startDate || '',
      days: activeItinerary?.days || [],
      routePoints,
      plan: routePlan,
    }),
    [version, activeItinerary, routePoints, routePlan],
  )
  const stripDays = (activeItinerary?.days || []).map((d) => ({
    id: d.id,
    dayNumber: d.dayNumber,
    cityName: d.cityName || '',
  }))
  const openDayPlan = drawerDay == null ? null : dayPlans.find((p) => p.dayNumber === drawerDay) || null
  const openDay = drawerDay == null || !activeItinerary
    ? null
    : activeItinerary.days.find((d) => d.dayNumber === drawerDay) || null
  const openTotalLabel = useMemo(() => totalRouteLabel(routePlan), [routePlan])

  const handleOpenDay = useCallback((dayNumber) => {
    if (dayNumber == null) return
    // 只开确实存在的天（段的天号来自点集，行程被改后可能已不存在）
    if (activeItinerary && !activeItinerary.days.some((d) => d.dayNumber === dayNumber)) return
    drawerKeyRef.current += 1
    setDrawer({ dayNumber, key: drawerKeyRef.current })
  }, [activeItinerary])
  const handleCloseDrawer = useCallback(() => setDrawer(null), [])
  // 切到右侧面板的「行程详情」视图（显式用户动作；不改面板默认展开状态）
  const handleOpenFullPanel = useCallback(() => {
    setPanelCollapsed(false)
    setPanelViewRequest({ view: 'quos', nonce: Date.now() })
  }, [])

  // Esc 关抽屉（输入框内不干扰）
  useEffect(() => {
    if (drawerDay == null) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const t = e.target
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      setDrawer(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerDay])

  const handleAddCityToItinerary = useCallback(
    (city) => {
      if (!activeItinerary) return
      addDay(activeItinerary.id, city.id, city.name)
    },
    [activeItinerary],
  )

  const handleEntityAddToItinerary = useCallback(
    (entity) => {
      if (!activeItinerary) return
      if (entity.cityId) addDay(activeItinerary.id, entity.cityId, entity.cityName)
    },
    [activeItinerary],
  )

  // 手机端：不需要地图，只显示面板（列表/详情）；地图仅桌面端渲染
  const showMap = !isMobile

  return (
    <main style={{ flex: 1, position: 'relative' }}>
      {!ready ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse"
              style={{ background: 'var(--bg-elevated)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载中...</p>
          </div>
        </div>
      ) : (
        <>
          {showMap && (
            <MapCore
              cities={cities}
              itineraryCityIds={itineraryCityIds}
              routePoints={routePoints}
              onCityClick={handleCityClick}
              onCityAddToItinerary={handleAddCityToItinerary}
              dayLabels={dayLabels}
              onEntityAddToItinerary={handleEntityAddToItinerary}
              onSegmentClick={handleOpenDay}
              onMapBlankClick={handleCloseDrawer}
              panelCollapsed={panelCollapsed}
              panelWidth={panelWidth}
            />
          )}
          {/* 刀3 · 底部行程条：只在有地图时渲染（移动端不渲染地图 → 由面板承接）；
              抽屉打开时整条右移，避免被抽屉盖住导致点不到 */}
          {showMap && stripDays.length > 0 && (
            <div
              className="flex justify-center items-end"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: drawerDay != null ? 380 : 0,
                right: !panelCollapsed && panelWidth > 0 ? panelWidth : 0,
                paddingBottom: 16,
                pointerEvents: 'none',
                zIndex: 850,
              }}
            >
              <DayStrip
                days={stripDays}
                activeDayNumber={drawerDay}
                onSelectDay={handleOpenDay}
              />
            </div>
          )}
          {/* 刀3 · 段抽屉（桌面贴左 / 移动端底部半屏）——无行程时不渲染 */}
          {showMap && activeItinerary && (
            <SegmentDrawer
              open={drawerDay != null && !!openDay}
              isMobile={isMobile}
              day={openDay}
              dayPlan={openDayPlan}
              totalLabel={openTotalLabel}
              itinerary={activeItinerary}
              version={version}
              openKey={drawer?.key ?? null}
              onClose={handleCloseDrawer}
              onOpenFullPanel={handleOpenFullPanel}
            />
          )}
          <FloatingPanel
            isMobile={isMobile}
            activeItinerary={activeItinerary}
            collapsed={panelCollapsed}
            onCollapsedChange={setPanelCollapsed}
            panelWidth={panelWidth}
            onWidthChange={setPanelWidth}
            viewRequest={panelViewRequest}
          />
        </>
      )}
    </main>
  )
}
