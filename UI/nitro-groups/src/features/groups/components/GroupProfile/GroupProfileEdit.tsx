import { X, Save, Music2, DollarSign } from "lucide-react";
import { Loader } from "@/components/ui";
import { Field } from "./Common";
import type { MusicGroup } from "../../types/MusicGroup";
import type { GenreListItem } from "../../services/groups.service";

type GroupProfileEditProps = {
  group: MusicGroup;
  originalGroup: MusicGroup;
  selectedGenres: number[];
  setSelectedGenres: React.Dispatch<React.SetStateAction<number[]>>;
  isPending: boolean;
  genres: GenreListItem[];
  isGenresLoading: boolean;
  handleSave: (e: React.FormEvent) => void;
  handleCancel: () => void;
  set: <K extends keyof MusicGroup>(k: K, v: MusicGroup[K]) => void;
};

export default function GroupProfileEdit({
  group,
  selectedGenres,
  setSelectedGenres,
  isPending,
  genres,
  isGenresLoading,
  handleSave,
  handleCancel,
  set,
}: GroupProfileEditProps) {
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
            <button type="submit" form="edit-form" disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/85 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {isPending ? <Loader /> : <Save size={16} />} Guardar
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
                  {isGenresLoading ? (
                    <span className="text-sm text-gray-500">Cargando géneros...</span>
                  ) : genres?.map(genre => {
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
            <button type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/85 text-white py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50 lg:hidden">
              {isPending ? <Loader /> : <Save size={18} />} Guardar Cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
