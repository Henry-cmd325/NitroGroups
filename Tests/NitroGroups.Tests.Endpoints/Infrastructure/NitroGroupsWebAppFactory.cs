using Cortex.Mediator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Context;
using NSubstitute;

namespace NitroGroups.Tests.Endpoints.Infrastructure;

/// <summary>
/// Factory compartida que levanta la API en memoria, reemplaza el DbContext
/// por uno InMemory, sustituye IMediator por un mock de NSubstitute y
/// configura un esquema de autenticación que aprueba cualquier petición.
/// </summary>
public class NitroGroupsWebAppFactory : WebApplicationFactory<Program>
{
    public IMediator Mediator { get; } = Substitute.For<IMediator>();
    public IUnitOfWorkGroups UnitOfWorkGroups { get; } = BuildUnitOfWorkGroupsMock();

    private static IUnitOfWorkGroups BuildUnitOfWorkGroupsMock()
    {
        var uow = Substitute.For<IUnitOfWorkGroups>();

        // MusicGenres mock: FindAsync devuelve lista vacía por defecto
        var genreRepo = Substitute.For<IGenericRepository<MusicGenre, long>>();
        genreRepo
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<MusicGenre, bool>>>())
            .Returns([]);
        uow.MusicGenres.Returns(genreRepo);

        return uow;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Reemplazar IMediator por el mock
            services.RemoveAll<IMediator>();
            services.AddSingleton(Mediator);

            // Reemplazar IUnitOfWorkGroups por el mock
            services.RemoveAll<IUnitOfWorkGroups>();
            services.AddScoped(_ => UnitOfWorkGroups);

            // Reemplazar NitroGroupsContext por base de datos en memoria
            services.RemoveAll<DbContextOptions<NitroGroupsContext>>();
            services.RemoveAll<NitroGroupsContext>();
            services.AddDbContext<NitroGroupsContext>(options =>
                options.UseInMemoryDatabase("NitroGroupsTestDb"));

            // Autenticación que aprueba toda petición (bypass de JWT):
            // registrar el esquema y sobreescribir los defaults DESPUÉS de que
            // AddAuthentication+AddJwtBearer ya fueron registrados.
            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });

            services.PostConfigureAll<AuthenticationOptions>(opts =>
            {
                opts.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                opts.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }
}
