using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Reflection;

namespace NitroGroups.Shared.EndpointMapping
{
    public static class EndpointExtensions
    {
        public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
        {
            ServiceDescriptor[] serviceDescriptors = [.. assembly.DefinedTypes
                .Where(type => type is { IsAbstract: false, IsInterface: false } &&
                               type.IsAssignableTo(typeof(IEndpoint)))
                .Select(type => ServiceDescriptor.Transient(typeof(IEndpoint), type))];

            services.TryAddEnumerable(serviceDescriptors);

            return services;
        }
        public static IApplicationBuilder MapEndpoints(this WebApplication app, RouteGroupBuilder? routeGroupBuilder = null)
        {
            IEnumerable<IEndpoint> endpoints = app.Services.GetRequiredService<IEnumerable<IEndpoint>>()
                // Rutas "más largas" (p. ej. .../media/upload) antes, orden estable por tipo
                .OrderByDescending(e => e.GetType().Name.Contains("Upload", StringComparison.Ordinal))
                .ThenBy(e => e.GetType().FullName, StringComparer.Ordinal);

            IEndpointRouteBuilder builder = routeGroupBuilder is null ? app : routeGroupBuilder;

            foreach (IEndpoint endpoint in endpoints)
            {
                endpoint.MapEndpoint(builder);
            }

            return app;
        }
    }
}
