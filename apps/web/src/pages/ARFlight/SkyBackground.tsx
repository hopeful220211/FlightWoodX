export function SkyBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#7DB8D9] via-[#a8d4ea] to-[#d4eaf5] overflow-hidden">
      {/* CSS clouds */}
      <div
        className="absolute rounded-full bg-white/60 blur-md"
        style={{ width: 200, height: 60, top: '15%', left: '10%', animation: 'cloudDrift 30s linear infinite' }}
      />
      <div
        className="absolute rounded-full bg-white/50 blur-md"
        style={{ width: 280, height: 80, top: '25%', left: '55%', animation: 'cloudDrift 40s linear infinite', animationDelay: '-10s' }}
      />
      <div
        className="absolute rounded-full bg-white/40 blur-lg"
        style={{ width: 160, height: 50, top: '40%', left: '30%', animation: 'cloudDrift 35s linear infinite', animationDelay: '-20s' }}
      />
      <style>{`
        @keyframes cloudDrift {
          from { transform: translateX(-300px); }
          to { transform: translateX(calc(100vw + 300px)); }
        }
      `}</style>
    </div>
  )
}
