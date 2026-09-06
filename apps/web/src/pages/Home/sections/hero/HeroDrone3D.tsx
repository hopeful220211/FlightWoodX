/**
 * Hero drone display: 3 layered drone images with floating animations.
 * Front drone (web_1) is largest, middle (web_2) smaller, back (web_3) smallest.
 * Each has a unique float pattern: vertical bob + slow horizontal sway.
 */

const drones = [
  {
    src: '/optimized/picture/UI/web_3.webp',
    alt: '远处无人机',
    // Back: smallest, top-right, most blur
    className: 'absolute top-0 right-0 w-[35%] lg:right-[-10%] lg:w-[50%] opacity-50 blur-[1px]',
    style: { animation: 'droneFloat3 7s ease-in-out infinite' },
  },
  {
    src: '/optimized/picture/UI/web_2.webp',
    alt: '中间无人机',
    // Middle: medium size, center-right
    className: 'absolute top-[10%] right-[-5%] w-[55%] lg:right-[-20%] lg:w-[75%] opacity-75',
    style: { animation: 'droneFloat2 6s ease-in-out infinite' },
  },
  {
    src: '/optimized/picture/UI/web_1.webp',
    alt: '主无人机',
    // Front: largest, bottom-center-right, sharpest
    className: 'absolute bottom-[-10%] right-[-10%] w-[100%] lg:bottom-[-20%] lg:right-[-25%] lg:w-[160%] drone-front',
    style: { animation: 'droneFloat1 5s ease-in-out infinite' },
  },
]

export function HeroDrone3D() {
  return (
    <div className="relative w-full h-full min-h-[300px]">
      {drones.map((drone, i) => (
        <img
          key={i}
          src={drone.src}
          alt={drone.alt}
          className={drone.className}
          style={drone.style}
          loading={i === 2 ? 'eager' : 'lazy'}
          fetchPriority={i === 2 ? 'high' : 'low'}
          decoding="async"
          draggable={false}
        />
      ))}

      <style>{`
        @keyframes droneFloat1 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          25% { transform: translateY(-8px) translateX(3px) rotate(0.3deg); }
          50% { transform: translateY(-4px) translateX(-2px) rotate(-0.2deg); }
          75% { transform: translateY(-10px) translateX(1px) rotate(0.2deg); }
        }
        @keyframes droneFloat1Lg {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg) scale(1.3); }
          25% { transform: translateY(-8px) translateX(3px) rotate(0.3deg) scale(1.3); }
          50% { transform: translateY(-4px) translateX(-2px) rotate(-0.2deg) scale(1.3); }
          75% { transform: translateY(-10px) translateX(1px) rotate(0.2deg) scale(1.3); }
        }
        @media (min-width: 1024px) {
          .drone-front { animation-name: droneFloat1Lg !important; }
        }
        @keyframes droneFloat2 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          30% { transform: translateY(-6px) translateX(-4px) rotate(-0.4deg); }
          60% { transform: translateY(-10px) translateX(2px) rotate(0.3deg); }
          80% { transform: translateY(-3px) translateX(-1px) rotate(-0.1deg); }
        }
        @keyframes droneFloat3 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          20% { transform: translateY(-4px) translateX(3px) rotate(0.5deg); }
          50% { transform: translateY(-7px) translateX(-3px) rotate(-0.3deg); }
          70% { transform: translateY(-2px) translateX(2px) rotate(0.2deg); }
        }
      `}</style>
    </div>
  )
}
