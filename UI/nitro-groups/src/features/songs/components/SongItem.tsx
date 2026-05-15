"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { songsService } from "../songs.service";
import type { MusicTrackDto } from "../types";
import { Loader } from "@/components/ui/Loader";

interface SongItemProps {
    trackId: string;
    id: number;
    onRemove: (id: number) => void;
}

export const SongItem: React.FC<SongItemProps> = ({ trackId, id, onRemove }) => {
    const [track, setTrack] = useState<MusicTrackDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const info = await songsService.getTrackInfo(trackId);
                setTrack(info);
            } catch (error) {
                console.error("Error fetching track info", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [trackId]);

    if (loading) return <div className="p-4 border rounded-lg bg-white animate-pulse">Cargando detalles...</div>;

    if (!track) return (
        <div className="flex items-center justify-between border p-4 rounded-lg bg-white shadow-sm">
            <span className="text-gray-500">Track ID: {trackId} (No se pudo cargar info)</span>
            <Button size="sm" variant="danger" onClick={() => onRemove(id)}>Eliminar</Button>
        </div>
    );

    return (
        <div className="flex items-center justify-between border p-4 rounded-lg bg-white shadow-sm">
            <div className="flex items-center space-x-4">
                <img src={track.albumImageUrl} alt={track.albumName} className="w-12 h-12 rounded" />
                <div>
                    <h4 className="font-bold text-gray-900">{track.title}</h4>
                    <p className="text-sm text-gray-600">{track.artistName} - {track.albumName}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Button size="sm" variant="danger" onClick={() => onRemove(id)}>Eliminar</Button>
            </div>
        </div>
    );
};
