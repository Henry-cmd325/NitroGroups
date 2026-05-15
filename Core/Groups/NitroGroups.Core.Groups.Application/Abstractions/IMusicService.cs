namespace NitroGroups.Core.Groups.Application.Abstractions;

public interface IMusicService
{
    Task<IEnumerable<MusicTrackDto>> SearchTracksAsync(string query, int limit = 20);
}

public record MusicTrackDto(
    string ExternalTrackId,
    string Title,
    string ArtistName,
    string AlbumName,
    string AlbumImageUrl,
    int DurationMs,
    string PreviewUrl);
