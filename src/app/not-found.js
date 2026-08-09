import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🗺️</div>
          <h1 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            404 · 地图上找不到这个地方
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            这个坐标还没有被绘制到我们的地图上。
          </p>
          <Link
            href="/"
            className="inline-flex px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            ← 回到地图起点
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
