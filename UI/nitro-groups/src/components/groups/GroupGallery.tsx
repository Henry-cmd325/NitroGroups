"use client";

import { useRef, useState } from "react";
import { Plus, Play, Image as ImageIcon, Film, MoreHorizontal, Music, Trash2, X } from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { groupsService } from "@/services/groups.service";
import { uploadGroupMediaFile } from "@/lib/groupMediaUpload";
import { Loader } from "@/components/ui";
import type { GroupMediaResponse } from "@/types/GroupMedia";
import type { MusicGroup } from "@/types/MusicGroup";

type GroupGalleryProps = {
    media?: GroupMediaResponse[];
};

export default function GroupGallery({ media: mediaProp }: GroupGalleryProps) {
    const { user } = useCurrentUser();
    const queryClient = useQueryClient();

    // Use query to subscribe to the cache/fetch if needed
    const groupQuery = useQuery({
        queryKey: ["music-group", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            return groupsService.getByUserId(user.id);
        },
        enabled: !mediaProp && !!user?.id,
        staleTime: 1000 * 60 * 10,
    });

    const cachedGroup = groupQuery.data;
    const media = mediaProp ?? cachedGroup?.media ?? [];
    const groupId = cachedGroup?.id;

    // Local state for add media modal
    const [isAdding, setIsAdding] = useState(false);
    const [addMode, setAddMode] = useState<"upload" | "url">("upload");
    const [newMedia, setNewMedia] = useState({ type: "photo", url: "", title: "" });
    /** `File` en `useState` fuerza re-renders con un objeto gordo; en Windows + Next 16 (Turbopack) a veces inestable al elegir archivo; se usa ref + etiqueta. */
    const fileRef = useRef<File | null>(null);
    const [fileSelectionLabel, setFileSelectionLabel] = useState<string | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    const openAddModal = () => {
        setFileInputKey((k) => k + 1);
        fileRef.current = null;
        setFileSelectionLabel(null);
        setIsAdding(true);
    };

    // Delete state
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Mutations
    const addMutation = useMutation({
        mutationFn: async () => {
            if (!groupId) throw new Error("No group context");
            const picked = fileRef.current;
            if (addMode === "upload" && picked) {
                const { url, mediaType } = await uploadGroupMediaFile(groupId, picked);
                return groupsService.addMedia(groupId, {
                    type: mediaType,
                    url,
                    title: newMedia.title,
                    displayOrder: media.length,
                });
            }
            return groupsService.addMedia(groupId, {
                type: newMedia.type,
                url: newMedia.url,
                title: newMedia.title,
                displayOrder: media.length,
            });
        },
        onSuccess: () => {
            // Refetch group to get updated media list
            if (user?.id) {
                groupsService.getByUserId(user.id).then(freshGroup => {
                    if (freshGroup) queryClient.setQueryData(["music-group", user.id], freshGroup);
                });
            }
            setIsAdding(false);
            setAddMode("upload");
            fileRef.current = null;
            setFileSelectionLabel(null);
            setFileInputKey((k) => k + 1);
            setNewMedia({ type: "photo", url: "", title: "" });
        }
    });

    const removeMutation = useMutation({
        mutationFn: async (mediaId: number) => {
            if (!groupId) throw new Error("No group context");
            return groupsService.removeMedia(groupId, mediaId);
        },
        onSuccess: (_, deletedId) => {
            if (user?.id && cachedGroup) {
                const updatedGroup = { 
                    ...cachedGroup, 
                    media: cachedGroup.media?.filter((m: GroupMediaResponse) => m.id !== deletedId) || [] 
                };
                queryClient.setQueryData(["music-group", user.id], updatedGroup);
            }
            setDeletingId(null);
        }
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (addMode === "upload") {
            if (fileRef.current) {
                addMutation.mutate();
            }
        } else if (newMedia.url?.trim()) {
            addMutation.mutate();
        }
    };

    return (
        <div className="w-full text-white py-2">
            {/* header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-semibold">Galería Multimedia</h2>
                    <p className="text-sm text-gray-500 mt-1">Fotos y videos de tus presentaciones.</p>
                </div>
                {groupId && (
                    <button 
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/85 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
                    >
                        <Plus size={16} /> Subir Contenido
                    </button>
                )}
            </div>

            {/* grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* upload placeholder */}
                {groupId && (
                    <div 
                        onClick={openAddModal}
                        className="bg-card border-2 border-dashed border-border rounded-2xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                    >
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="text-primary" size={24} />
                        </div>
                        <p className="text-sm font-medium text-white">Añadir foto o video</p>
                        <p className="text-xs text-gray-500 mt-1">Subida a almacenamiento (R2) — máx. 50 MB</p>
                    </div>
                )}

                {media.length === 0 ? (
                    /* empty state */
                    <div className="sm:col-span-1 lg:col-span-2 bg-card border border-border rounded-2xl aspect-[4/3] flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <Music className="text-primary/40" size={28} />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Aún no tienes contenido multimedia</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs text-center">
                            ¡Sube tus mejores fotos y videos de presentaciones para atraer más clientes!
                        </p>
                    </div>
                ) : (
                    /* gallery items */
                    (media as GroupMediaResponse[]).map((item) => (
                        <div key={item.id} className="group relative bg-card rounded-2xl overflow-hidden aspect-[4/3] border border-border">
                            {item.type === "video" ? (
                                <div className="w-full h-full bg-black/50 flex flex-col items-center justify-center">
                                    <Film size={48} className="text-white/20 mb-2" />
                                </div>
                            ) : item.type === "audio" ? (
                                <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center">
                                    <Music size={48} className="text-primary/40 mb-2" />
                                </div>
                            ) : (
                                <img src={item.url} alt={item.title || "Media"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            )}

                            {/* hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-between p-4">
                                {/* top right menu */}
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button 
                                        onClick={() => { setDeletingId(item.id); removeMutation.mutate(item.id); }}
                                        disabled={removeMutation.isPending && deletingId === item.id}
                                        className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        {(removeMutation.isPending && deletingId === item.id) ? (
                                            <Loader className="w-4 h-4" />
                                        ) : (
                                            <Trash2 size={16} className="text-white" />
                                        )}
                                    </button>
                                </div>

                                {/* bottom info */}
                                <div>
                                    <p className="text-sm font-medium text-white truncate shadow-black drop-shadow-md">{item.title || "Sin título"}</p>
                                </div>
                            </div>

                            {/* type badge */}
                            <div className="absolute top-3 left-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                                {item.type === "video" ? <Film size={14} className="text-white" /> : 
                                 item.type === "audio" ? <Music size={14} className="text-white" /> : 
                                 <ImageIcon size={14} className="text-white" />}
                            </div>

                            {/* play button for video */}
                            {item.type === "video" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-12 h-12 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center pl-0.5 shadow-lg">
                                        <Play className="text-white fill-white" size={18} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Media Modal (Simple overlay for now, normally would use a real Dialog component) */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-border">
                            <h3 className="text-lg font-semibold">Añadir Contenido</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                            <div className="flex rounded-xl border border-border p-0.5 bg-background/50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddMode("upload");
                                    }}
                                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                                        addMode === "upload" ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Subir archivo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddMode("url");
                                        fileRef.current = null;
                                        setFileSelectionLabel(null);
                                        setFileInputKey((k) => k + 1);
                                    }}
                                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                                        addMode === "url" ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Enlace (URL)
                                </button>
                            </div>
                            {addMode === "upload" && (
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5" htmlFor="group-media-file">Archivo</label>
                                <input
                                    id="group-media-file"
                                    key={fileInputKey}
                                    type="file"
                                    accept="image/*,video/*,audio/*"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        const f = e.target.files?.[0] ?? null;
                                        fileRef.current = f;
                                        setFileSelectionLabel(
                                            f
                                                ? `${f.name} (${f.size > 0 ? Math.max(1, Math.round(f.size / 1024)) : 0} KB)`
                                                : null
                                        );
                                    }}
                                    className="block w-full min-w-0 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-primary"
                                />
                                {fileSelectionLabel ? (
                                    <p className="text-xs text-emerald-500/90 mt-1.5" aria-live="polite">
                                        Listo: {fileSelectionLabel}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1.5">Imagen, video o audio · máx. 50 MB</p>
                                )}
                            </div>
                            )}
                            {addMode === "url" && (
                            <>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Tipo de contenido</label>
                                <select 
                                    value={newMedia.type} 
                                    onChange={e => setNewMedia({...newMedia, type: e.target.value})}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                >
                                    <option value="photo">Foto</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Audio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">URL</label>
                                <input 
                                    type="url" 
                                    value={newMedia.url} 
                                    onChange={e => setNewMedia({...newMedia, url: e.target.value})}
                                    placeholder="https://" 
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Enlace directo, YouTube, etc.</p>
                            </div>
                            </>
                            )}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Título (opcional)</label>
                                <input 
                                    type="text" 
                                    value={newMedia.title} 
                                    onChange={e => setNewMedia({...newMedia, title: e.target.value})}
                                    placeholder="Ej. Concierto en vivo" 
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsAdding(false);
                                        setAddMode("upload");
                                        fileRef.current = null;
                                        setFileSelectionLabel(null);
                                        setFileInputKey((k) => k + 1);
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={
                                        addMutation.isPending ||
                                        (addMode === "upload" && !fileSelectionLabel) ||
                                        (addMode === "url" && !newMedia.url?.trim())
                                    }
                                    className="flex-1 bg-primary hover:bg-primary/80 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm flex justify-center items-center"
                                >
                                    {addMutation.isPending ? <Loader className="w-5 h-5" /> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

