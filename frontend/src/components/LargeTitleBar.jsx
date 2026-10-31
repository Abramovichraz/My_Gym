import { useEffect, useRef, useState } from 'react'

// The iOS large title: once the page's big heading scrolls up under the status bar, a compact
// bar with the same title fades in on a blurred background, and a tap on it scrolls back to the
// top. It reads whatever `.hdr h1` the current page has, so no view needs to know about it; the
// workout screen keeps its own sticky header (.whdr) and is left out.
export default function LargeTitleBar({ path }) {
  const [title, setTitle] = useState('')
  const bar = useRef(null)
  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const h = document.querySelector('#app .hdr h1')
      const r = h && !h.closest('.whdr') ? h.getBoundingClientRect() : null
      setTitle(r && bar.current && r.bottom < bar.current.getBoundingClientRect().bottom ? h.textContent : '')
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(check) }
    addEventListener('scroll', on, { passive: true })
    check()
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [path])
  return <div ref={bar} className={'lt-bar' + (title ? ' on' : '')} aria-hidden="true"
    onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}><span>{title}</span></div>
}
