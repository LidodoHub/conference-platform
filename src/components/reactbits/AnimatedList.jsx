import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** React Bits — AnimatedList (JS-TW), entrée discrète en cascade */
export default function AnimatedList({
  children,
  className = '',
  stagger = 0.06,
  duration = 0.5,
  threshold = 0.15,
  as: Tag = 'ul',
}) {
  const ref = useRef(null)
  const played = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const items = el.children
    if (!items.length) return

    const animate = () => {
      if (played.current) return
      played.current = true
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease: 'power2.out',
      })
    }

    gsap.set(items, { opacity: 0, y: 10 })

    const st = ScrollTrigger.create({
      trigger: el,
      start: `top ${(1 - threshold) * 100}%`,
      once: true,
      onEnter: animate,
    })

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.92) animate()
    })

    return () => st.kill()
  }, [stagger, duration, threshold])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
