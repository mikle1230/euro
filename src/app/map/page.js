export const metadata = {
  title: '地图 · Euro Atlas',
  description: '城市、酒店、景点、餐厅一图查询',
}

const MAP_EMBED =
  'https://www.google.com/maps/d/embed?mid=15mNXV_q5YES1DmwC4kMlUUCHqMwghGo&ehbc=2E312F&noprof=1'
const MAP_OPEN =
  'https://www.google.com/maps/d/edit?mid=15mNXV_q5YES1DmwC4kMlUUCHqMwghGo&usp=sharing'

export default function MapPage() {
  return (
    <main className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b text-xs sm:text-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium shrink-0">冰岛</span>
          <span className="opacity-60 truncate">城市 · 酒店 · 景点 · 餐厅</span>
        </div>
        <a
          href={MAP_OPEN}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          在新窗口打开
        </a>
      </div>
      <iframe
        src={MAP_EMBED}
        title="冰岛地图（Google My Maps）"
        className="w-full flex-1 border-0"
        style={{ minHeight: 'calc(100vh - 96px)' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="px-3 sm:px-5 py-1.5 text-[11px] opacity-50 shrink-0">
        如地图空白，多半是当前网络无法访问 Google 服务。
      </p>
    </main>
  )
}
