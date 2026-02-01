"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MusicGroup } from "@/types/MusicGroup";
import { Loader } from "../controls";
import { getApiAccessToken } from "@/lib/auth-client";

const emptyGroup: MusicGroup = {
  id: 0,
  ownerUserId: 0,
  slug: "",
  groupName: "",
  description: "",
  biography: "",
  numMembers: 0,
  yearsExperience: 0,
  phone: "",
  email: "",
  locationText: "",
  serviceRadiusKm: 0,
  currency: "",
  basePrice: 0,
  hourlyRate: 0,
  minimumDurationHours: 0,
  setupTimeMinutes: 0,
  averageRating: 0,
  totalReviews: 0,
  viewCount: 0,
  bookingCount: 0,
  isVerified: false,
  isFeatured: false,
  isAcceptingBookings: false,
  active: false,
};

export default function GroupProfile() {
  const userId = 1;
  const queryClient = useQueryClient();
  const [group, setGroup] = useState<MusicGroup>(emptyGroup);
  const [originalGroup, setOriginalGroup] = useState<MusicGroup>(emptyGroup);
  const [isEditing, setIsEditing] = useState(false);

  const groupQuery = useQuery({
    queryKey: ["music-group", userId],
    queryFn: async () => {
      const accessToken = await getApiAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userId}/groups`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("No se pudo cargar el grupo");
      }
      return (await response.json()) as MusicGroup;
    },
    staleTime: 1000 * 60 * 10, // 10 min sin refetch automático
    gcTime: 1000 * 60 * 30,    // 30 min en caché
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: MusicGroup) => {
      const accessToken = await getApiAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/groups/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar el grupo");
      }

      return payload;
    },
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(["music-group", updatedGroup.id], updatedGroup);
      setGroup(updatedGroup);
      setOriginalGroup(updatedGroup);
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (groupQuery.data) {
      setGroup(groupQuery.data);
      setOriginalGroup(groupQuery.data);
    }
  }, [groupQuery.data]);

  const toggleEditMode = () => {
    if (!isEditing) {
      setOriginalGroup({ ...group });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(group);
  };

  const handleCancel = () => {
    setGroup({ ...originalGroup });
    setIsEditing(false);
  };

  const handleChange = <K extends keyof MusicGroup>(key: K, value: MusicGroup[K]) => {
    setGroup((prev) => ({ ...prev, [key]: value }));
  };

  if (groupQuery.isLoading) {
    return (
      <div className="text-white px-8 py-5">
        <Loader/>
      </div>
    );
  }

  if (groupQuery.isError) {
    return (
      <div className="text-white px-8 py-5">
        <div className="max-w-7xl mx-auto">
          Error al cargar el grupo.
        </div>
      </div>
    );
  }

  return (
    <div className=" text-white px-8 py-5">
      <div className="max-w-7xl mx-auto">
        {isEditing ? (
          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-400">Image</span>
                </div>
                <div>
                  <label
                    htmlFor="groupName"
                    className="block text-sm font-medium text-gray-400"
                  >
                    Group Name
                  </label>
                  <input
                    id="groupName"
                    value={group.groupName}
                    onChange={(event) => handleChange("groupName", event.target.value)}
                    className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-400"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={group.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="biography"
                  className="block text-sm font-medium text-gray-400"
                >
                  Biography
                </label>
                <textarea
                  id="biography"
                  rows={5}
                  value={group.biography}
                  onChange={(event) => handleChange("biography", event.target.value)}
                  className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg space-y-6">
              <h3 className="text-xl font-semibold text-white">
                Información de Contratación
              </h3>
              <div>
                <label
                  htmlFor="basePrice"
                  className="block text-sm font-medium text-gray-400"
                >
                  Rango de precio
                </label>
                <input
                  id="basePrice"
                  type="number"
                  value={group.basePrice}
                  onChange={(event) =>
                    handleChange("basePrice", Number(event.target.value))
                  }
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="yearsExperience"
                  className="block text-sm font-medium text-gray-400"
                >
                  Experiencia
                </label>
                <input
                  id="yearsExperience"
                  type="number"
                  value={group.yearsExperience}
                  onChange={(event) =>
                    handleChange("yearsExperience", Number(event.target.value))
                  }
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                />
              </div>
              <div className="space-y-4">
                <button
                  type="submit"
                  className="w-full bg-primary hover:cursor-pointer hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full hover:cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-6">
                <img
                  className="h-24 w-24 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1544598256-fc4016e12325?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXZlJTIwbXVzaWMlMjBjb25jZXJ0JTIwYmFuZCUyMHN0YWdlfGVufDF8fHx8MTc1NzgyMTg3NHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Band photo"
                />
                <div>
                  <h1 className="text-4xl font-bold">{group.groupName}</h1>
                  <div className="flex items-center space-x-4 text-gray-400 mt-2">
                    <span>🎵 Rock Alternativo</span>
                    <span>📍 {group.locationText}</span>
                    <span>
                      ⭐ {group.averageRating} ({group.totalReviews} reseñas)
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-gray-300">{group.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                  Rock
                </span>
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                  Alternativo
                </span>
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                  Pop Rock
                </span>
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                  Covers
                </span>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg h-fit">
              <h3 className="text-xl font-semibold text-white">
                Información de Contratación
              </h3>
              <div className="mt-6 space-y-4">
                <div>
                  <span className="text-gray-400 text-sm">Rango de precio</span>
                  <p className="text-primary font-bold text-2xl">
                    ${group.basePrice}-${group.basePrice + 700}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Experiencia</span>
                  <p className="text-white font-semibold">
                    {group.yearsExperience}+ años
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Disponibilidad</span>
                  <p className="text-white font-semibold">
                    Disponible fines de semana
                  </p>
                </div>
              </div>
              <button
                onClick={toggleEditMode}
                className="mt-8 w-full bg-primary hover:cursor-pointer hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Editar Perfil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
