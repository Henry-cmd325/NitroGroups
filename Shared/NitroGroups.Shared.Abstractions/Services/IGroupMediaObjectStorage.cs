namespace NitroGroups.Shared.Abstractions.Services
{
    /// <summary>
    /// Almacenamiento de objetos para medios de grupo (p. ej. Cloudflare R2, API S3-compatible).
    /// </summary>
    public interface IGroupMediaObjectStorage
    {
        /// <param name="objectKey">P. ej. <c>groups/12/archivo.jpg</c></param>
        Task<(string? PublicUrl, string? Error)> UploadObjectAsync(
            string objectKey,
            Stream content,
            string contentType,
            CancellationToken cancellationToken = default);
    }
}
