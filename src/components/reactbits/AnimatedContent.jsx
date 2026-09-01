import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** React Bits — AnimatedContent (JS-TW) */
export default function AnimatedContent({
  children,
  container,
  distance = 60,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  threshold = 0.15,
  delay = 0,
  className = '',
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let scrollerTarget = container || null
    if (typeof scrollerTarget === 'string') {
      scrollerTarget = document.querySelector(scrollerTarget)
    }

    const axis = direction === 'horizontal' ? 'x' : 'y'
    const offset = reverse ? -distance : distance
    const startPct = (1 - threshold) * 100

    gsap.set(el, {
      [axis]: offset,
      opacity: animateOpacity ? initialOpacity : 1,
      visibility: 'visible',
    })

    const tl = gsap.timeline({ paused: true, delay })

    tl.to(el, {
      [axis]: 0,
      opacity: 1,
      duration,
      ease,
    })

    const st = ScrollTrigger.create({
      trigger: el,
      scroller: scrollerTarget,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    })

    return () => {
      st.kill()
      tl.kill()
    }
  }, [container, distance, direction, reverse, duration, ease, initialOpacity, animateOpacity, threshold, delay])

  return (
    <div ref={ref} className={className} style={{ visibility: 'hidden' }} {...props}>
      {children}
    </div>
  )
}
