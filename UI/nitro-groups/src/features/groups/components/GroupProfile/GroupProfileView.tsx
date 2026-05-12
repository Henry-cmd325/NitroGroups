import { Edit3, Camera, Award, Star, MapPin, Users, Zap } from "lucide-react";
import { StatCard } from "./Common";
import GroupCalendar from "@/features/groupAvailability/components/GroupCalendar";
import type { MusicGroup } from "../../types/MusicGroup";

type GroupProfileViewProps = {
  group: MusicGroup;
  isPublic: boolean;
  toggleEdit: () => void;
};

const FALLBACK_COVER = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop";
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1544598256-fc4016e12325?q=80&w=400&auto=format&fit=crop";

export default function GroupProfileView({ group, isPublic, toggleEdit }: GroupProfileViewProps) {
  const cover = group.coverImageUrl || FALLBACK_COVER;
  const avatar = group.profilePictureUrl || FALLBACK_AVATAR;

  return (
    <div className="w-full text-white">
      {/* ─ Cover ─ */}
      <div className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80 overflow-hidden rounded-b-3xl">
        <img src={cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* edit button on cover */}
        {!isPublic && (
          <button onClick={toggleEdit}
            className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-sm px-4 py-2 rounded-full transition-all">
            <Edit3 size={15} /> Editar Perfil
          </button>
        )}

        {/* cover change hint */}
        {!isPublic && (
          <button className="absolute bottom-5 right-5 z-20 flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs px-3 py-1.5 rounded-full transition-all opacity-0 hover:opacity-100 group-hover:opacity-100">
            <Camera size={14} /> Cambiar portada
          </button>
        )}
      </div>

      {/* ─ Profile header ─ */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-start gap-6 -mt-16 relative z-10">
          {/* avatar */}
          <div className="shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-background overflow-hidden bg-card shadow-xl">
              <img src={avatar} alt={group.groupName} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* name + meta */}
          <div className="pt-2 sm:pt-8 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-bold truncate">
                {group.groupName || "Tu Grupo"}
              </h1>
              {group.isVerified && (
                <span className="flex items-center gap-1 bg-primary/20 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Award size={14} /> Verificado
                </span>
              )}
            </div>

            {group.description && (
              <p className="mt-2 text-gray-400 text-base line-clamp-2 max-w-2xl">{group.description}</p>
            )}

            {/* genre pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {(group.genres && group.genres.length > 0) ? group.genres.map((g) => (
                <span key={g.id} className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1 rounded-full">
                  {g.name}
                </span>
              )) : (
                <span className="text-xs text-gray-500 italic">Sin géneros asignados</span>
              )}
            </div>
          </div>
        </div>

        {/* ─ Stats row ─ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <StatCard icon={<Star size={18} className="text-amber-400" />}
            label="Calificación" value={group.averageRating ? `${group.averageRating}` : "Nuevo"}
            sub={`${group.totalReviews} reseñas`} />
          <StatCard icon={<MapPin size={18} className="text-rose-400" />}
            label="Ubicación" value={group.locationText || "—"} />
          <StatCard icon={<Users size={18} className="text-sky-400" />}
            label="Integrantes" value={`${group.numMembers || 1}`} />
          <StatCard icon={<Zap size={18} className="text-primary" />}
            label="Experiencia" value={group.yearsExperience ? `${group.yearsExperience} años` : "—"} />
        </div>

        {/* ─ Main grid: bio + pricing ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* biography */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8">
            <h3 className="text-lg font-semibold mb-4">Acerca del grupo</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
              {group.biography || "Aún no has escrito una biografía. Cuéntale al mundo sobre tu música y trayectoria."}
            </p>
          </div>

          {/* pricing sidebar */}
          <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-500" />
            <h3 className="text-lg font-semibold mb-6">Contratación</h3>

            <div className="space-y-5">
              {group.basePrice ? (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Desde</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${group.basePrice.toLocaleString()} <span className="text-sm text-gray-500 font-normal">{group.currency || "MXN"}</span>
                  </p>
                </div>
              ) : group.hourlyRate ? (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Costo por Hora</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${group.hourlyRate.toLocaleString()} <span className="text-sm text-gray-500 font-normal">{group.currency || "MXN"}</span>
                  </p>
                </div>
              ) : null}

              <div className="h-px bg-border" />

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Disponibilidad</p>
                {group.isAcceptingBookings ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-medium px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aceptando eventos
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 text-sm font-medium px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    No disponible
                  </span>
                )}
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cobertura</p>
                <p className="text-sm text-gray-300">Hasta {group.serviceRadiusKm || 50} km</p>
              </div>
            </div>

            {isPublic && (
              <button className="mt-8 w-full bg-primary hover:bg-primary/85 text-white font-semibold py-3.5 rounded-xl transition-colors">
                Solicitar Presupuesto
              </button>
            )}
          </div>
        </div>

        {isPublic && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-6">Disponibilidad</h3>
            <GroupCalendar groupId={group.id} mode="public" />
          </div>
        )}
      </div>
    </div>
  );
}
