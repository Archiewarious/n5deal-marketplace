import { ImageResponse } from 'next/og'

export const alt = 'N5Deal — the marketplace for licensed financial assets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Without this a pasted link previews as a bare URL, which is how a prototype looks like a
// prototype. Generated rather than shipped as a file, and deliberately typographic: there is no
// photograph of a licence worth faking.
//
// The one place in the app where raw hex is correct rather than lazy. Satori has no stylesheet
// and no CSS variables, so these are hand-copied from the dark palette in globals.css — which
// means they can drift, and did: --faint moved for contrast and this file had to move with it.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#1a1a1c',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#1d3f6b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            N5
          </div>
          <div style={{ color: '#94949a', fontSize: 22, letterSpacing: 4 }}>LICENCE REGISTER</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#edece9',
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            Banking and fintech businesses,
          </div>
          <div
            style={{
              color: '#edece9',
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              display: 'flex',
              gap: 18,
            }}
          >
            <span>sold with the</span>
            <span style={{ color: '#7fa8d8' }}>licence attached</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 44, color: '#9c9c9e', fontSize: 24 }}>
          <span>Banks</span>
          <span>EMIs</span>
          <span>Payment institutions</span>
          <span>Crypto entities</span>
        </div>
      </div>
    ),
    size,
  )
}
