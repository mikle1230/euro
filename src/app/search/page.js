import Header from '@/components/header'
import Footer from '@/components/footer'
import SearchResults from '@/components/search-results'
import { SITE } from '@/lib/config'

export const metadata = {
  title: '搜索',
  description: `搜索${SITE.name}的所有旅行目的地`,
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="px-4 md:px-8 pt-10 pb-4 text-center" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h1 className="text-3xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            🔍 搜索
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            输入关键词查找欧洲旅行目的地
          </p>
        </div>
        <section className="px-4 md:px-8 py-6" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <SearchResults />
        </section>
      </main>
      <Footer />
    </>
  )
}
