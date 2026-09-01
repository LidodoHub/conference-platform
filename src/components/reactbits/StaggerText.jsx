import { motion } from 'motion/react'

/** Stagger text reveal — inspiré React Bits SplitText, sans plugin GSAP Club */
export default function StaggerText({
  text,
  className = '',
  tag: Tag = 'h1',
  delay = 0.04,
  duration = 0.6,
  splitBy = 'words',
}) {
  const parts = splitBy === 'chars' ? text.split('') : text.split(' ')

  return (
    <Tag className={`${className} flex flex-wrap`} aria-label={text}>
      {parts.map((part, i) => (
        <span key={i} className="overflow-hidden inline-block">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration,
              delay: i * delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {part}
            {splitBy === 'words' && i < parts.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
