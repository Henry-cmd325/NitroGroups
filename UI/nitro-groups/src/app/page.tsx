import Badge from "@/components/controls/Badge";
import { PlayIcon, CrowdIcon, CalendarIcon } from "@/components/icons";

export default function Home() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4 py-15 lg:py-18">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                🎵 Conecta la música con el mundo
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                La plataforma que conecta{" "}
                <span className="text-primary">artistas</span> con{" "}
                <span className="text-primary">eventos</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                NitroGroups es el punto de encuentro entre grupos musicales
                independientes y organizadores de eventos. Gestiona tu agenda,
                conecta con clientes y haz crecer tu carrera musical.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/auth/login"
                className="cursor-pointer text-lg h-12 px-8 rounded bg-primary text-white hover:bg-primary/90 flex items-center justify-center"
              >
                <PlayIcon className="h-6 mr-2" />
                <span>Comenzar Ahora</span>
              </a>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="flex items-center space-x-2">
                <CrowdIcon className="text-muted-foreground h-6" />
                <span className="text-sm text-muted-foreground">
                  500+ Artistas
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <CalendarIcon className="text-muted-foreground h-6" />
                <span className="text-sm text-muted-foreground">
                  1000+ Eventos
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1544598256-fc4016e12325?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXZlJTIwbXVzaWMlMjBjb25jZXJ0JTIwYmFuZCUyMHN0YWdlfGVufDF8fHx8MTc1NzgyMTg3NHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Concierto en vivo"
                className="w-full h-100 lg:h-125 object-cover"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="text-lg font-semibold">
                  🎸 Conecta con tu audiencia
                </p>
                <p className="text-sm opacity-90">
                  Miles de eventos esperando por tu música
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
