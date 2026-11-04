namespace NitroGroups.Shared.Abstractions.Services
{
    /// <summary>
    /// Envío de emails transaccionales. Por defecto solo se registran en el log
    /// (<c>LoggingEmailSender</c>); con <c>Email:Smtp:Host</c> configurado se envían por SMTP.
    /// </summary>
    public interface IEmailSender
    {
        Task SendAsync(string to, string subject, string textBody, CancellationToken ct);
    }
}
