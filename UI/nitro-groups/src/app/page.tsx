export default function Home() {
  return (
    <div className="flex flex-col gap-24 py-16">
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Plataforma creativa
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Conecta artistas y clientes en un solo lugar
          </h1>
          <p className="text-lg text-muted-foreground">
            NitroGroups centraliza proyectos, contratos y pagos para impulsar
            colaboraciones rápidas y confiables.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="h-11 rounded bg-primary px-6 font-medium text-white hover:bg-primary/90">
              Crear cuenta
            </button>
            <button className="h-11 rounded border border-border px-6 font-medium hover:bg-accent">
              Ver demo
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Panel centralizado</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona proyectos, agenda y facturación con un flujo simple e
              intuitivo.
            </p>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border bg-background p-3">
                Seguimiento en tiempo real
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                Mensajería y archivos
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                Pagos protegidos
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="artistas" className="space-y-6">
        <h2 className="text-3xl font-semibold">Para artistas</h2>
        <p className="text-muted-foreground">
          Crea tu portafolio, recibe solicitudes y automatiza entregas sin perder
          el control creativo.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Portafolio profesional",
            "Agenda inteligente",
            "Pagos asegurados",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <h3 className="font-semibold">{item}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Optimiza tu flujo de trabajo y mantén cada proyecto bajo
                control.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="clientes" className="space-y-6">
        <h2 className="text-3xl font-semibold">Para clientes</h2>
        <p className="text-muted-foreground">
          Descubre talento, compara propuestas y asegura entregas transparentes.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Búsqueda avanzada",
            "Contratos claros",
            "Historial completo",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <h3 className="font-semibold">{item}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Procesos simples para contratar y recibir resultados de calidad.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="funcionalidades" className="space-y-6">
        <h2 className="text-3xl font-semibold">Funcionalidades clave</h2>
        <p className="text-muted-foreground">
          Herramientas diseñadas para escalar tu comunidad creativa.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Gestión de proyectos con estados personalizados.",
            "Notificaciones y recordatorios automáticos.",
            "Panel de métricas para rendimiento y finanzas.",
            "Integraciones listas para pagos y contratos digitales.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
