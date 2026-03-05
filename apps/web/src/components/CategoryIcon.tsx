'use client'

interface CategoryIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { wrap: 'w-8 h-8', icon: 'text-base' },
  md: { wrap: 'w-10 h-10', icon: 'text-xl' },
  lg: { wrap: 'w-12 h-12', icon: 'text-2xl' },
}

export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const { wrap, icon: iconSize } = sizeMap[size]
  return (
    <div
      className={`${wrap} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: color + '33' }}
    >
      <span
        className={`material-symbols-outlined ${iconSize}`}
        style={{ color, fontSize: 'inherit' }}
      >
        {icon}
      </span>
    </div>
  )
}
