using Microsoft.Extensions.Logging;
using NitroGroups.Shared.Abstractions.Services;

namespace NitroGroups.Shared.Infrastructure.Services
{
    /// <summary>
    /// Implementación para desarrollo y tests: no envía nada, solo deja constancia en el log.
    /// Registra el destinatario y el asunto, nunca el cuerpo (puede traer datos personales).
    /// </summary>
    public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
    {
        public Task SendAsync(string to, string subject, string textBody, CancellationToken ct)
        {
            logger.LogInformation("Email no enviado (modo log) a {To}: {Subject}", to, subject);
            return Task.CompletedTask;
        }
    }
}
