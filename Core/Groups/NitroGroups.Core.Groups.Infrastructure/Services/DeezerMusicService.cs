using System.Net.Http.Json;
using System.Text.Json.Serialization;
using NitroGroups.Core.Groups.Application.Abstractions;

namespace NitroGroups.Core.Groups.Infrastructure.Services;

public class DeezerMusicService(HttpClient httpClient) : IMusicService
{
    public async Task<IEnumerable<MusicTrackDto>> SearchTracksAsync(string query, int limit = 20)
    {
        var response = await httpClient.GetFromJsonAsync<DeezerSearchResponse>($"search?q={Uri.EscapeDataString(query)}&limit={limit}");

        if (response?.Data == null)
            return [];

        return response.Data.Select(d => new MusicTrackDto(
            d.Id.ToString(),
            d.Title,
            d.Artist.Name,
            d.Album.Title,
            d.Album.CoverMedium,
            d.Duration * 1000,
            d.Preview));
    }

    private class DeezerSearchResponse
    {
        [JsonPropertyName("data")]
        public List<DeezerTrack> Data { get; set; } = [];
    }

    private class DeezerTrack
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
        [JsonPropertyName("duration")]
        public int Duration { get; set; }
        [JsonPropertyName("preview")]
        public string Preview { get; set; } = string.Empty;
        [JsonPropertyName("artist")]
        public DeezerArtist Artist { get; set; } = null!;
        [JsonPropertyName("album")]
        public DeezerAlbum Album { get; set; } = null!;
    }

    private class DeezerArtist
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private class DeezerAlbum
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
        [JsonPropertyName("cover_medium")]
        public string CoverMedium { get; set; } = string.Empty;
    }
}
