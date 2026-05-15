"use client";

import React, { useState, useEffect } from "react";
import { songsService } from "../songs.service";
import type { MusicTrackDto } from "../types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";

interface SongSearchProps {
    onSelect: (track: MusicTrackDto) => void;
}

export const SongSearch: React.FC<SongSearchProps> = ({ onSelect }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MusicTrackDto[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);
                try {
                    const data = await songsService.search(query);
                    setResults(data);
                } catch (error) {
                    console.error("Error searching songs", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <div className="space-y-4">
            <Input
                placeholder="Buscar canción en Deezer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-white text-gray-900"
            />
            {loading && <Loader />}
            <div className="max-h-60 overflow-y-auto space-y-2">
                {results.map((track) => (
                    <div
                        key={track.externalTrackId}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => onSelect(track)}
                    >
                        <div className="flex items-center space-x-3">
                            <img src={track.albumImageUrl} alt={track.albumName} className="w-10 h-10 rounded" />
                            <div>
                                <p className="font-medium text-sm text-gray-900">{track.title}</p>
                                <p className="text-xs text-gray-500">{track.artistName}</p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline">Agregar</Button>
                    </div>
                ))}
            </div>
        </div>
    );
};
