import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
})

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1z" /></svg>
)
export const GearIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10.2 3h3.6l.5 2.5 1.7.7 2.1-1.4 2.5 2.5-1.4 2.1.7 1.7 2.5.5v3.6l-2.5.5-.7 1.7 1.4 2.1-2.5 2.5-2.1-1.4-1.7.7-.5 2.5h-3.6l-.5-2.5-1.7-.7-2.1 1.4-2.5-2.5 1.4-2.1-.7-1.7L2.5 13.8v-3.6L5 9.7l.7-1.7-1.4-2.1 2.5-2.5 2.1 1.4 1.7-.7z" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
  </svg>
)
export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 2.8c.5 3 3.2 4.3 4.7 6.7 1.9 3 1.4 7.2-1.6 9.4-2.8 2-6.9 1.5-8.7-1.3-1.4-2.2-.9-4.6.4-6.3.3 1.1 1 1.9 1.9 2.2-.3-3 .9-6.6 3.3-10.7z" />
    <path d="M12 20.2c-1.6-.1-2.7-1.3-2.5-2.7.2-1.2 1.3-1.8 2.5-3.4 1.2 1.6 2.3 2.2 2.5 3.4.2 1.4-.9 2.6-2.5 2.7z" />
  </svg>
)
export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M3.5 20.5c.6-3.4 3.8-5.5 8.5-5.5s7.9 2.1 8.5 5.5z" /></svg>
)
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="M12 4.5v15M4.5 12h15" /></svg>
)
export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', ...p })}><path d="M8 5.5v13l11-6.5z" /></svg>
)
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>
)
export const StopIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}><rect x="6" y="6" width="12" height="12" rx="2.2" /></svg>
)
export const EditIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
)
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></svg>
)
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const BackIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, ...p })}><path d="M15 5l-7 7 7 7" /></svg>
)
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
)
