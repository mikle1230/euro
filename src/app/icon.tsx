import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 340,
            height: 340,
            borderRadius: '50%',
            border: '14px solid rgba(255,255,255,0.3)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 160,
              color: '#fff',
              fontWeight: 700,
              fontFamily: 'system-ui',
            }}
          >
            EA
          </div>
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
