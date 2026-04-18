import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(200,144,42,0.08)_0%,_transparent_70%)]" />

        <div className="relative z-10 max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-parchment-400">
            Powered by the SRD 5.1
          </p>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-stone-100 sm:text-7xl">
            Gestiona tu{" "}
            <span className="text-parchment-400">Aventura</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-stone-400 sm:text-xl">
            Crea y gestiona tus personajes de D&amp;D 5e. Lleva registro de tus
            aventuras, hechizos, inventario y más — diseñado para la mesa de juego.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="btn-primary px-8 py-3 text-base">
              Empezar gratis
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-3 text-base">
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-stone-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="mb-16 text-center text-3xl font-bold text-stone-100">
          Todo lo que necesitas en la mesa
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card">
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-stone-100">{feature.title}</h3>
              <p className="text-sm text-stone-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    icon: "⚔️",
    title: "Hoja de Personaje Completa",
    description:
      "Estadísticas, habilidades, hechizos e inventario calculados automáticamente con las reglas de D&D 5e.",
  },
  {
    icon: "🎲",
    title: "Motor de Reglas",
    description:
      "CA, HP, tiradas de salvación y bonificaciones calculadas automáticamente según raza, clase y equipo.",
  },
  {
    icon: "📖",
    title: "Contenido SRD 5.1",
    description:
      "Todas las razas, clases, hechizos y objetos del SRD incluidos. Agrega contenido homebrew de tu mesa.",
  },
  {
    icon: "🗺️",
    title: "Gestión de Campañas",
    description:
      "Crea campañas, invita jugadores con un código y lleva el registro de toda la party.",
  },
  {
    icon: "📱",
    title: "Diseño Responsive",
    description:
      "Optimizado para celular — úsalo en la mesa de juego sin cargar papeles.",
  },
  {
    icon: "🔒",
    title: "Control de Acceso",
    description:
      "El DM controla qué fuentes de contenido están disponibles para cada jugador.",
  },
];
