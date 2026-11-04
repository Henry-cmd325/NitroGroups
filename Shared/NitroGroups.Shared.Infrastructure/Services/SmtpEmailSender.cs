using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NitroGroups.Shared.Abstractions.Services;
using System.Net;
using System.Net.Mail;

namespace NitroGroups.Shared.Infrastructure.Services
{
    /// <summary>Configuración de <c>Email</c> (ver README, sección "Emails").</summary>
    public sealed class EmailOptions
    {
        public const string SectionName = "Email";

        /// <summary>Remitente de todos los emails.</summary>
        public string From { get; set; } = "NitroGroups <no-reply@nitrogroups.com>";

        public SmtpOptions Smtp { get; set; } = new();

        public sealed class SmtpOptions
        {
            public string? Host { get; set; }
            public int Port { get; set; } = 587;
            public string? Username { get; set; }
            public string? Password { get; set; }
            public bool EnableSsl { get; set; } = true;
        }
    }

    /// <summary>Envío por SMTP con System.Net.Mail. Se usa cuando <c>Email:Smtp:Host</c> está definido.</summary>
    public sealed class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
    {
        public async Task SendAsync(string to, string subject, string textBody, CancellationToken ct)
        {
            var settings = options.Value;
            var smtp = settings.Smtp;

            using var client = new SmtpClient(smtp.Host, smtp.Port) { EnableSsl = smtp.EnableSsl };
            if (!string.IsNullOrWhiteSpace(smtp.Username))
                client.Credentials = new NetworkCredential(smtp.Username, smtp.Password);

            using var message = new MailMessage
            {
                From = new MailAddress(settings.From),
                Subject = subject,
                Body = textBody,
                IsBodyHtml = false
            };
            message.To.Add(to);

            await client.SendMailAsync(message, ct);
            logger.LogInformation("Email enviado a {To}: {Subject}", to, subject);
        }
    }
}
