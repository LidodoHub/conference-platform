import { useRef } from 'react'

/** React Bits — GlareHover (JS-TW) */
export default function GlareHover({
  width = '100%',
  height = 'auto',
  background = 'transparent',
  borderRadius = '12px',
  borderColor = 'transparent',
  children,
  glareColor = '#C8963E',
  glareOpacity = 0.35,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
  className = '',
  style = {},
}) {
  const hex = glareColor.replace('#', '')
  let rgba = glareColor
  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`
  }

  const overlayRef = useRef(null)

  const animateIn = () => {
    const el = overlayRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.backgroundPosition = '-100% -100%, 0 0'
    el.style.transition = `${transitionDuration}ms ease`
    el.style.backgroundPosition = '100% 100%, 0 0'
  }

  const animateOut = () => {
    const el = overlayRef.current
    if (!el) return
    if (playOnce) {
      el.style.transition = 'none'
      el.style.backgroundPosition = '-100% -100%, 0 0'
    } else {
      el.style.transition = `${transitionDuration}ms ease`
      el.style.backgroundPosition = '-100% -100%, 0 0'
    }
  }

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(${glareAngle}deg,
      hsla(0,0%,0%,0) 60%,
      ${rgba} 70%,
      hsla(0,0%,0%,0) 100%)`,
    backgroundSize: `${glareSize}% ${glareSize}%, 100% 100%`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '-100% -100%, 0 0',
    pointerEvents: 'none',
    borderRadius,
  }

  return (
    <div
      className={`relative overflow-hidden border ${className}`}
      style={{
        width,
        height,
        background,
        borderRadius,
        borderColor,
        ...style,
      }}
      onMouseEnter={animateIn}
      onMouseLeave={animateOut}
    >
      <div ref={overlayRef} style={overlayStyle} aria-hidden="true" />
      {children}
    </div>
  )
}
