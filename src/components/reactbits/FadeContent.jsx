import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** React Bits — FadeContent (JS-TW), version douce */
export default function FadeContent({
  children,
  blur = false,
  duration = 0.9,
  delay = 0,
  threshold = 0.12,
  initialOpacity = 0,
  className = '',
  ...props
}) {
  const ref = useRef(null)
  const played = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const animate = () => {
      if (played.current) return
      played.current = true
      gsap.to(el, {
        opacity: 1,
        filter: 'blur(0px)',
        duration,
        delay,
        ease: 'power2.out',
      })
    }

    gsap.set(el, {
      opacity: initialOpacity,
      filter: blur ? 'blur(6px)' : 'blur(0px)',
    })

    const st = ScrollTrigger.create({
      trigger: el,
      start: `top ${(1 - threshold) * 100}%`,
      once: true,
      onEnter: animate,
    })

    // Contenu above-the-fold : animer tout de suite
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.92) animate()
    })

    return () => st.kill()
  }, [blur, duration, delay, threshold, initialOpacity])

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }} {...props}>
      {children}
    </div>
  )
}
