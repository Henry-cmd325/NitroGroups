using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Infrastructure.Configuration;

namespace NitroGroups.Shared.Infrastructure.Services
{
    /// <summary>
    /// Sube archivos a Cloudflare R2 mediante la API S3-compatible.
    /// </summary>
    public sealed class R2GroupMediaStorage : IGroupMediaObjectStorage
    {
        private readonly IOptions<R2StorageOptions> _options;
        private readonly ILogger<R2GroupMediaStorage> _log;

        public R2GroupMediaStorage(IOptions<R2StorageOptions> options, ILogger<R2GroupMediaStorage> log)
        {
            _options = options;
            _log = log;
        }

        public async Task<(string? PublicUrl, string? Error)> UploadObjectAsync(
            string objectKey,
            Stream content,
            string contentType,
            CancellationToken cancellationToken = default)
        {
            var o = _options.Value;
            if (string.IsNullOrWhiteSpace(o.AccessKeyId) || string.IsNullOrWhiteSpace(o.SecretAccessKey))
            {
                return (null, "R2 no está configurado (R2:AccessKeyId, R2:SecretAccessKey).");
            }

            if (string.IsNullOrWhiteSpace(o.PublicBaseUrl))
            {
                return (null, "R2:PublicBaseUrl no está definido (URL pública del bucket o dominio).");
            }

            var bucket = o.Bucket.Trim();
            if (string.IsNullOrEmpty(bucket))
            {
                return (null, "R2:Bucket no está definido.");
            }

            var serviceUrl = ResolveServiceUrl(o);
            if (serviceUrl is null)
            {
                return (null, "R2: indica AccountId o R2:ServiceUrl para el endpoint S3.");
            }

            // R2 no soporta el Streaming SigV4 / checksums por defecto del AWSSDK.S3.
            // https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/
            var credentials = new BasicAWSCredentials(o.AccessKeyId.Trim(), o.SecretAccessKey.Trim());
            // AWSSDK.Core ≥3.7.500 calcula checksums en requests cuando WHEN_SUPPORTED; R2 devuelve 501 NotImplemented.
            // https://community.cloudflare.com/t/x-amz-checksum-mode-not-implemented/542935
            var config = new AmazonS3Config
            {
                ServiceURL = serviceUrl,
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            };

            try
            {
                using var client = new AmazonS3Client(credentials, config);
                var request = new PutObjectRequest
                {
                    BucketName = bucket,
                    Key = objectKey,
                    InputStream = content,
                    ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                    DisablePayloadSigning = true,
                    DisableDefaultChecksumValidation = true,
                };

                await client.PutObjectAsync(request, cancellationToken).ConfigureAwait(false);
                var publicUrl = BuildPublicUrl(o.PublicBaseUrl, objectKey);
                return (publicUrl, null);
            }
            catch (TaskCanceledException ex)
            {
                _log.LogWarning(ex, "Timeout o cancelación al subir a R2");
                return (null, "Timeout o cancelación al subir el archivo.");
            }
            catch (AmazonS3Exception ex)
            {
                _log.LogWarning(ex, "R2 rechazó la subida: {Code} {Message}", ex.ErrorCode, ex.Message);
                return (null, $"Error de almacenamiento ({ex.StatusCode}): {ex.ErrorCode ?? ex.Message}");
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Fallo inesperado al subir a R2");
                return (null, "No se pudo conectar al almacenamiento. Comprueba credenciales, bucket y red.");
            }
        }

        private static string? ResolveServiceUrl(R2StorageOptions o)
        {
            if (!string.IsNullOrWhiteSpace(o.ServiceUrl))
            {
                return o.ServiceUrl.Trim().TrimEnd('/');
            }

            var account = o.AccountId.Trim();
            return string.IsNullOrEmpty(account)
                ? null
                : $"https://{account}.r2.cloudflarestorage.com";
        }

        private static string BuildPublicUrl(string publicBase, string objectKey)
        {
            var baseUrl = publicBase.Trim().TrimEnd('/');
            var parts = objectKey.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var encoded = string.Join('/', parts.Select(Uri.EscapeDataString));
            return $"{baseUrl}/{encoded}";
        }
    }
}
