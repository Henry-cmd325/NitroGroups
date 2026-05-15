"use client";

import React, { useState, useEffect } from "react";
import { songsService } from "../songs.service";
import type { GroupSongDto, MusicTrackDto } from "../types";
import { SongItem } from "./SongItem";
import { SongSearch } from "./SongSearch";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";

interface SongListProps {
    groupId: number;
}

export const SongList: React.FC<SongListProps> = ({ groupId }) => {
    const [songs, setSongs] = useState<GroupSongDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);

    const loadSongs = async () => {
        setLoading(true);
        try {
            const data = await songsService.getByGroupId(groupId);
            setSongs(data);
        } catch (error) {
            console.error("Error loading group songs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSongs();
    }, [groupId]);

    const handleAddSong = async (track: MusicTrackDto) => {
        try {
            await songsService.addToGroup(groupId, {
                trackId: track.externalTrackId
            });
            setShowSearch(false);
            loadSongs();
        } catch (error) {
            console.error("Error adding song", error);
        }
    };

    const handleRemoveSong = async (id: number) => {
        try {
            await songsService.remove(id);
            setSongs(songs.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error removing song", error);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Repertorio ({songs.length})</h3>
                <Button onClick={() => setShowSearch(!showSearch)}>
                    {showSearch ? "Cerrar Buscador" : "Agregar Canción"}
                </Button>
            </div>

            {showSearch && (
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <SongSearch onSelect={handleAddSong} />
                </div>
            )}

            <div className="space-y-4">
                {songs.length === 0 ? (
                    <p className="text-gray-500 text-center py-10">No hay canciones en tu repertorio.</p>
                ) : (
                    songs.map(song => (
                        <SongItem
                            key={song.id}
                            id={song.id}
                            trackId={song.trackId}
                            onRemove={handleRemoveSong}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
