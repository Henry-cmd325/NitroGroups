using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Infrastructure.Configuration;
using NitroGroups.Shared.Infrastructure.Context.Interceptors;
using NitroGroups.Shared.Infrastructure.Events;
using NitroGroups.Shared.Infrastructure.Services;

namespace NitroGroups.Shared.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<R2StorageOptions>(configuration.GetSection("R2"));
            services.PostConfigure<R2StorageOptions>(o =>
            {
                if (string.IsNullOrWhiteSpace(o.AccessKeyId))
                {
                    o.AccessKeyId = (Environment.GetEnvironmentVariable("R2__AccessKeyId")
                        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCESS_KEY_ID")
                        ?? string.Empty).Trim();
                }
                if (string.IsNullOrWhiteSpace(o.SecretAccessKey))
                {
                    o.SecretAccessKey = (Environment.GetEnvironmentVariable("R2__SecretAccessKey")
                        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
                        ?? string.Empty).Trim();
                }
                if (string.IsNullOrWhiteSpace(o.AccountId))
                {
                    o.AccountId = (Environment.GetEnvironmentVariable("R2__AccountId")
                        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCOUNT_ID")
                        ?? string.Empty).Trim();
                }
                if (string.IsNullOrWhiteSpace(o.Bucket))
                {
                    var fromEnv = (Environment.GetEnvironmentVariable("R2__Bucket")
                        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_BUCKET"))?.Trim();
                    o.Bucket = string.IsNullOrEmpty(fromEnv) ? "group-media" : fromEnv;
                }
                if (string.IsNullOrWhiteSpace(o.PublicBaseUrl))
                {
                    o.PublicBaseUrl = (Environment.GetEnvironmentVariable("R2__PublicBaseUrl")
                        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_PUBLIC_BASE_URL")
                        ?? string.Empty).Trim();
                }
                var serviceUrlEnv = Environment.GetEnvironmentVariable("R2__ServiceUrl")
                    ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SERVICE_URL");
                if (!string.IsNullOrWhiteSpace(serviceUrlEnv))
                {
                    o.ServiceUrl = serviceUrlEnv.Trim();
                }
            });
            services.AddScoped<IGroupMediaObjectStorage, R2GroupMediaStorage>();

            services.AddScoped<ICurrentUserService, CurrentUserService>();

            // Emails: por SMTP si hay host configurado; si no, solo al log (desarrollo y tests).
            services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
            if (!string.IsNullOrWhiteSpace(configuration["Email:Smtp:Host"]))
                services.AddSingleton<IEmailSender, SmtpEmailSender>();
            else
                services.AddSingleton<IEmailSender, LoggingEmailSender>();

            services.TryAddSingleton(TimeProvider.System);

            services.AddScoped<AuditInterceptor>();

            // Cada módulo registra su DbContext y su outbox con AddModuleDbContext<T>().
            if (!services.Any(d => d.ServiceType == typeof(OutboxModuleRegistry)))
                services.AddSingleton(new OutboxModuleRegistry());

            services.AddSingleton<IEventProvider, EventProvider>();
            services.AddHostedService<OutboxProcessor>();

            return services;
        }
    }
}
