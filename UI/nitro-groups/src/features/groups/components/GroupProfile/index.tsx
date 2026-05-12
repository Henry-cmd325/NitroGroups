"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MusicGroup } from "../../types/MusicGroup";
import { Loader } from "@/components/ui";
import { groupsService } from "../../services/groups.service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import GroupProfileView from "./GroupProfileView";
import GroupProfileEdit from "./GroupProfileEdit";
import type { GroupProfileProps } from "./types";

/* ─── empty‑state fallback ─── */
const emptyGroup: MusicGroup = {
  id: 0, ownerUserId: 0, slug: "", groupName: "", description: "",
  biography: "", numMembers: 0, yearsExperience: 0, phone: "", email: "",
  locationText: "", serviceRadiusKm: 0, currency: "", basePrice: 0,
  hourlyRate: 0, minimumDurationHours: 0, setupTimeMinutes: 0,
  averageRating: 0, totalReviews: 0, viewCount: 0, bookingCount: 0,
  isVerified: false, isFeatured: false, isAcceptingBookings: false, active: false,
};

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

  if (isEditing && !isPublic) {
    return (
      <GroupProfileEdit
        group={group}
        originalGroup={originalGroup}
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        isPending={saveMutation.isPending}
        genres={genresQuery.data || []}
        isGenresLoading={genresQuery.isLoading}
        handleSave={handleSave}
        handleCancel={handleCancel}
        set={set}
      />
    );
  }

  return (
    <GroupProfileView
      group={group}
      isPublic={isPublic}
      toggleEdit={toggleEdit}
    />
  );
}
