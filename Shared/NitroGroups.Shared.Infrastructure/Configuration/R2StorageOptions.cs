namespace NitroGroups.Shared.Infrastructure.Configuration
{
    /// <summary>
    /// Cloudflare R2 (API compatible S3). Credenciales: token S3 de R2 (Access Key / Secret).
    /// </summary>
    public sealed class R2StorageOptions
    {
        /// <summary>ID de cuenta Cloudflare (subdominio <c>{AccountId}.r2.cloudflarestorage.com</c>).</summary>
        public string AccountId { get; set; } = string.Empty;

        /// <summary>Opcional. Si está vacío se usa <c>https://{AccountId}.r2.cloudflarestorage.com</c>.</summary>
        public string? ServiceUrl { get; set; }

        public string AccessKeyId { get; set; } = string.Empty;

        public string SecretAccessKey { get; set; } = string.Empty;

        public string Bucket { get; set; } = "group-media";

        /// <summary>
        /// URL pública base del bucket (p. ej. dominio r2.dev, custom domain o Worker) sin barra final.
        /// La URL devuelta al cliente será <c>{PublicBaseUrl}/{objectKey}</c> (segmentos codificados).
        /// </summary>
        public string PublicBaseUrl { get; set; } = string.Empty;
    }
}
