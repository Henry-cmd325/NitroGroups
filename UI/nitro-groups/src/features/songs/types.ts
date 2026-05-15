export interface MusicTrackDto {
    externalTrackId: string;
    title: string;
    artistName: string;
    albumName: string;
    albumImageUrl: string;
    durationMs: number;
    previewUrl: string;
}

export interface GroupSongDto {
    id: number;
    groupId: number;
    trackId: string;
}

export interface AddSongRequest {
    trackId: string;
}
