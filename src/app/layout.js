import { Geist, Noto_Sans_SC } from 'next/font/google'
import './globals.css'
import { SITE } from '@/lib/config'
import Header from '@/components/header'
import ToastHost from '@/components/toast'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sc',
})

export const metadata = {
  title: SITE.name,
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="zh-CN"
      className={`${geist.variable} ${notoSansSC.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash theme script — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('euro-theme')
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark')
                  }
                } catch(e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <ToastHost />
      </body>
    </html>
  )
}
