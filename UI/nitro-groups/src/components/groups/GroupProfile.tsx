"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MusicGroup } from "@/types/MusicGroup";
import { Loader } from "@/components/ui";
import GroupCalendar from "./GroupCalendar";
import { groupsService } from "@/services/groups.service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  MapPin, Star, Clock, DollarSign, Edit3, X, Save,
  Music2, Users, Award, Zap, Camera
} from "lucide-react";

/* ─── empty‑state fallback ─── */
const emptyGroup: MusicGroup = {
  id: 0, ownerUserId: 0, slug: "", groupName: "", description: "",
  biography: "", numMembers: 0, yearsExperience: 0, phone: "", email: "",
  locationText: "", serviceRadiusKm: 0, currency: "", basePrice: 0,
  hourlyRate: 0, minimumDurationHours: 0, setupTimeMinutes: 0,
  averageRating: 0, totalReviews: 0, viewCount: 0, bookingCount: 0,
  isVerified: false, isFeatured: false, isAcceptingBookings: false, active: false,
};

type GroupProfileProps = {
  mode?: "private" | "public";
  slug?: string;
  initialGroup?: MusicGroup;
};

/* ─────────────────────── component ─────────────────────── */
export default function GroupProfile({ mode = "private", slug, initialGroup }: GroupProfileProps) {
  const { user: currentUser } = useCurrentUser();
  const userId = currentUser?.id;
  const isPublic = mode === "public";

  const queryClient = useQueryClient();
  const [group, setGroup] = useState<MusicGroup>(initialGroup ?? emptyGroup);
  const [originalGroup, setOriginalGroup] = useState<MusicGroup>(initialGroup ?? emptyGroup);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  const shouldFetch =
    !initialGroup && (!isPublic || Boolean(slug)) && (!isPublic ? Boolean(userId) : true);

  /* ── queries ── */
  const groupQuery = useQuery({
    queryKey: isPublic ? ["music-group-public", slug] : ["music-group", userId],
    queryFn: async () => {
      if (isPublic) {
        if (!slug) throw new Error("No se pudo cargar el grupo");
        return groupsService.getBySlug(slug);
      }
      if (!userId) throw new Error("Usuario no autenticado");
      return groupsService.getByUserId(userId);
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 5,
    retryDelay: 3000,
    enabled: shouldFetch,
  });

  const genresQuery = useQuery({
    queryKey: ["music-genres"],
    queryFn: () => groupsService.listGenres(),
    staleTime: 1000 * 60 * 60,
    enabled: isEditing,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: MusicGroup) => {
      const updatePayload = {
        slug: payload.slug,
        groupName: payload.groupName,
        description: payload.description,
        biography: payload.biography,
        numMembers: payload.numMembers,
        yearsExperience: payload.yearsExperience,
        phone: payload.phone || "",
        email: payload.email || "",
        locationText: payload.locationText,
        serviceRadiusKm: payload.serviceRadiusKm,
        currency: payload.currency,
        basePrice: payload.basePrice,
        hourlyRate: payload.hourlyRate,
        minimumDurationHours: payload.minimumDurationHours,
        setupTimeMinutes: payload.setupTimeMinutes,
        isAcceptingBookings: payload.isAcceptingBookings,
        profilePictureUrl: payload.profilePictureUrl,
        coverImageUrl: payload.coverImageUrl,
      };

      const updatedGroup = await groupsService.update(payload.id, updatePayload);
      if (group.id > 0) {
        await groupsService.assignGenres(group.id, selectedGenres);
        // Refresh the whole group to get the newly mapped genre objects
        if (!isPublic) {
          const fresh = await groupsService.getByUserId(userId!);
          if (fresh) return fresh;
        }
      }
      return updatedGroup;
    },
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(["music-group", updatedGroup.id], updatedGroup);
      setGroup(updatedGroup);
      setOriginalGroup(updatedGroup);
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (initialGroup) { setGroup(initialGroup); setOriginalGroup(initialGroup); return; }
    if (groupQuery.data) { setGroup(groupQuery.data); setOriginalGroup(groupQuery.data); }
  }, [groupQuery.data, initialGroup]);

  /* ── handlers ── */
  const toggleEdit = () => {
    if (isPublic) return;
    if (!isEditing) {
      setOriginalGroup({ ...group });
      setSelectedGenres(group.genres?.map(g => g.id) || []);
    }
    setIsEditing(!isEditing);
  };
  const handleSave = (e: React.FormEvent) => { e.preventDefault(); if (!isPublic) saveMutation.mutate(group); };
  const handleCancel = () => { setGroup({ ...originalGroup }); setIsEditing(false); };
  const set = <K extends keyof MusicGroup>(k: K, v: MusicGroup[K]) => setGroup((p) => ({ ...p, [k]: v }));

  /* ── loading / error ── */
  if (shouldFetch && groupQuery.isLoading) return <div className="flex justify-center py-24"><Loader /></div>;
  if (shouldFetch && groupQuery.isError) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg">No se encontró el grupo.</p>
      <p className="text-sm mt-2">Crea tu primer grupo para comenzar.</p>
    </div>
  );

  /* ── image URLs (dynamic with fallback) ── */
  const FALLBACK_COVER = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop";
  const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1544598256-fc4016e12325?q=80&w=400&auto=format&fit=crop";
  const cover = group.coverImageUrl || FALLBACK_COVER;
  const avatar = group.profilePictureUrl || FALLBACK_AVATAR;

  /* ── edit mode ── */
  if (isEditing && !isPublic) {
    return (
      <div className="w-full text-white">
        {/* top bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold">Editar perfil</h2>
            <div className="flex gap-3">
              <button type="button" onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-colors">
                <X size={16} /> Cancelar
              </button>
              <button type="submit" form="edit-form" disabled={saveMutation.isPending}
                className="flex items-center gap-2 bg-primary hover:bg-primary/85 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {saveMutation.isPending ? <Loader /> : <Save size={16} />} Guardar
              </button>
            </div>
          </div>
        </div>

        <form id="edit-form" onSubmit={handleSave} className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* left column — 3/5 */}
            <div className="lg:col-span-3 space-y-8">
              {/* general */}
              <section className="bg-card border border-border rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Music2 size={20} className="text-primary" />
                  <h3 className="text-base font-semibold">Información General</h3>
                </div>

                <Field label="Nombre del Grupo" required>
                  <input value={group.groupName} onChange={(e) => set("groupName", e.target.value)}
                    className="input-field" placeholder="Ej. Los Relámpagos" required />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Ubicación">
                    <input value={group.locationText} onChange={(e) => set("locationText", e.target.value)}
                      className="input-field" placeholder="Ciudad, Estado" />
                  </Field>
                  <Field label="Integrantes">
                    <input type="number" min={1} value={group.numMembers || ""} onChange={(e) => set("numMembers", parseInt(e.target.value) || 0)}
                      className="input-field" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="URL Foto de Perfil">
                    <input value={group.profilePictureUrl || ""} onChange={(e) => set("profilePictureUrl", e.target.value)}
                      className="input-field" placeholder="https://..." type="url" />
                  </Field>
                  <Field label="URL Portada">
                    <input value={group.coverImageUrl || ""} onChange={(e) => set("coverImageUrl", e.target.value)}
                      className="input-field" placeholder="https://..." type="url" />
                  </Field>
                </div>

                <Field label="Descripción corta">
                  <input value={group.description} onChange={(e) => set("description", e.target.value)}
                    className="input-field" placeholder="Frase que defina tu grupo" maxLength={150} />
                </Field>

                <Field label="Biografía">
                  <textarea rows={5} value={group.biography} onChange={(e) => set("biography", e.target.value)}
                    className="input-field resize-none" placeholder="Historia, estilo, trayectoria…" />
                </Field>

                <div className="pt-2">
                  <label className="block text-sm text-gray-400 mb-2">Géneros Musicales</label>
                  <div className="flex flex-wrap gap-2">
                    {genresQuery.isLoading ? (
                      <span className="text-sm text-gray-500">Cargando géneros...</span>
                    ) : genresQuery.data?.map(genre => {
                      const isSelected = selectedGenres.includes(genre.id);
                      return (
                        <button
                          key={genre.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGenres(prev => prev.filter(id => id !== genre.id));
                            } else {
                              setSelectedGenres(prev => [...prev, genre.id]);
                            }
                          }}
                          className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
                            isSelected 
                              ? 'bg-primary/20 border-primary text-primary' 
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Selecciona los géneros que mejor describan tu estilo musical.</p>
                </div>
              </section>
            </div>

            {/* right column — 2/5 */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-card border border-border rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign size={20} className="text-emerald-400" />
                  <h3 className="text-base font-semibold">Contratación</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Precio base">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" value={group.basePrice || ""} onChange={(e) => set("basePrice", Number(e.target.value) || undefined)}
                        className="input-field pl-8" />
                    </div>
                  </Field>
                  <Field label="Costo por hora">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" value={group.hourlyRate || ""} onChange={(e) => set("hourlyRate", Number(e.target.value) || undefined)}
                        className="input-field pl-8" />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Moneda">
                    <select value={group.currency || "MXN"} onChange={(e) => set("currency", e.target.value)}
                      className="input-field">
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </Field>
                  <Field label="Radio de servicio (km)">
                    <input type="number" value={group.serviceRadiusKm} onChange={(e) => set("serviceRadiusKm", Number(e.target.value))}
                      className="input-field" placeholder="Distancia máxima" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Horas mínimas">
                    <input type="number" min={1} value={group.minimumDurationHours || 1} onChange={(e) => set("minimumDurationHours", Number(e.target.value))}
                      className="input-field" />
                  </Field>
                  <Field label="Min. de instalación">
                    <input type="number" min={0} step={15} value={group.setupTimeMinutes || 0} onChange={(e) => set("setupTimeMinutes", Number(e.target.value))}
                      className="input-field" />
                  </Field>
                </div>

                <Field label="Años de experiencia">
                  <input type="number" min={0} value={group.yearsExperience || 0} onChange={(e) => set("yearsExperience", Number(e.target.value))}
                    className="input-field" />
                </Field>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={group.isAcceptingBookings}
                        onChange={(e) => set("isAcceptingBookings", e.target.checked)} />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${group.isAcceptingBookings ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${group.isAcceptingBookings ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-sm text-gray-300 font-medium">Aceptando eventos</span>
                  </label>
                </div>
              </section>

              {/* save mobile */}
              <button type="submit" disabled={saveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/85 text-white py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50 lg:hidden">
                {saveMutation.isPending ? <Loader /> : <Save size={18} />} Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  /* ─── view mode ─── */
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

/* ── small helpers ── */
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}
