import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function TableWrapper({ children, className = '' }) {
  const scrollRef = useRef(null)
  const [showLeftIndicator, setShowLeftIndicator] = useState(false)
  const [showRightIndicator, setShowRightIndicator] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftIndicator(scrollLeft > 10)
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)

      return () => {
        ref.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [children])

  return (
    <div className="relative">
      {/* Left Scroll Indicator */}
      {showLeftIndicator && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none flex items-center">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {/* Right Scroll Indicator */}
      {showRightIndicator && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none flex items-center justify-end">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className={`overflow-x-auto ${className}`}
      >
        {children}
      </div>

      {/* Mobile Hint */}
      {(showLeftIndicator || showRightIndicator) && (
        <p className="md:hidden text-xs text-center text-gray-400 mt-2 italic">
          ← Deslize para ver mais →
        </p>
      )}
    </div>
  )
}
