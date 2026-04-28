/**
 * Hero drone display: 3 layered PNG images creating depth illusion.
 * Images overflow naturally beyond container — no clipping.
 *
 * Layout (matching reference):
 * - web_3: top-right corner, small, faded, partially off-screen
 * - web_2: middle-right, medium, slightly faded
 * - web_1: right-center to bottom-right, large, sharp, dominant
 */

export function HeroDrone3D() {
  return (
    <div className="absolute inset-0 overflow-visible">
      {/* Back drone — small, top-right, faded */}
      <img
        src="/resource/picture/UI/web_3.png"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          width: '40%',
          top: '-15%',
          right: '-20%',
          opacity: 0.35,
          filter: 'blur(2px)',
          animation: 'droneFloat3 7s ease-in-out infinite',
        }}
        loading="lazy"
        draggable={false}
      />

      {/* Middle drone — medium, right side upper area */}
      <img
        src="/resource/picture/UI/web_2.png"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          width: '60%',
          top: '-5%',
          right: '-15%',
          opacity: 0.6,
          filter: 'blur(0.5px)',
          animation: 'droneFloat2 6s ease-in-out infinite',
        }}
        loading="lazy"
        draggable={false}
      />

      {/* Front drone — large, dominant, sharp */}
      <img
        src="/resource/picture/UI/web_1.png"
        alt="FlightWoodX 木质无人机"
        className="absolute pointer-events-none select-none"
        style={{
          width: '120%',
          top: '5%',
          right: '-25%',
          animation: 'droneFloat1 5s ease-in-out infinite',
        }}
        loading="eager"
        draggable={false}
      />

      <style>{`
        @keyframes droneFloat1 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          25% { transform: translateY(-8px) translateX(3px) rotate(0.3deg); }
          50% { transform: translateY(-4px) translateX(-2px) rotate(-0.2deg); }
          75% { transform: translateY(-10px) translateX(1px) rotate(0.2deg); }
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
