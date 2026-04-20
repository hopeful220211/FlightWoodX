const awards = [
  { name: 'iF Design Award', img: '/resource/picture/awards/if.png' },
  { name: 'Red Dot Design Award', img: '/resource/picture/awards/red-dot-logo.31372310.png' },
  { name: 'IDEA Award', img: '/resource/picture/awards/IDEA.png' },
  { name: 'G-Mark Award', img: '/resource/picture/awards/gmark.png' },
]

export function AwardsSection() {
  return (
    <section className="border-y border-black/5 bg-white/50 py-8 dark:border-white/10 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-6 text-center text-lg font-extrabold text-slate-700 dark:text-slate-200">
          荣获全球设计大奖的认可
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {awards.map((award) => (
            <div
              key={award.name}
              className="flex h-16 items-center opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
            >
              <img
                src={award.img}
                alt={award.name}
                className="h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
