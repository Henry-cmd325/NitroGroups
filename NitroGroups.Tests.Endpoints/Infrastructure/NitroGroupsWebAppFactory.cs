using Cortex.Mediator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Abstractions.Services;
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
    public IUnitOfWorkGroups UnitOfWorkGroups { get; }
    public IGenericRepository<Group, long> GroupsRepository { get; }
    public IGenericRepository<GroupMember, long> GroupMembersRepository { get; }
    public IGenericRepository<MusicGenre, long> MusicGenresRepository { get; }
    public IGenericRepository<GroupGenre, long> GroupGenresRepository { get; }
    public IGenericRepository<GroupMedia, long> GroupMediaRepository { get; }
    public IGroupMediaObjectStorage GroupMediaObjectStorage { get; } = Substitute.For<IGroupMediaObjectStorage>();

    public NitroGroupsWebAppFactory()
    {
        var uow = Substitute.For<IUnitOfWorkGroups>();
        var groupsRepo = Substitute.For<IGenericRepository<Group, long>>();
        var groupMembersRepo = Substitute.For<IGenericRepository<GroupMember, long>>();
        var genreRepo = Substitute.For<IGenericRepository<MusicGenre, long>>();
        var groupGenresRepo = Substitute.For<IGenericRepository<GroupGenre, long>>();
        var groupMediaRepo = Substitute.For<IGenericRepository<GroupMedia, long>>();

        GroupsRepository = groupsRepo;
        GroupMembersRepository = groupMembersRepo;
        MusicGenresRepository = genreRepo;
        GroupGenresRepository = groupGenresRepo;
        GroupMediaRepository = groupMediaRepo;

        genreRepo
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<MusicGenre, bool>>>())
            .Returns([]);
        groupMediaRepo
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupMedia, bool>>>())
            .Returns([]);
        groupGenresRepo
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupGenre, bool>>>())
            .Returns([]);

        uow.Groups.Returns(groupsRepo);
        uow.GroupMembers.Returns(groupMembersRepo);
        uow.MusicGenres.Returns(genreRepo);
        uow.GroupGenres.Returns(groupGenresRepo);
        uow.GroupMedia.Returns(groupMediaRepo);

        UnitOfWorkGroups = uow;
    }

    public void ResetGroupMocks()
    {
        GroupsRepository.ClearReceivedCalls();
        GroupMembersRepository.ClearReceivedCalls();
        MusicGenresRepository.ClearReceivedCalls();
        GroupGenresRepository.ClearReceivedCalls();
        GroupMediaRepository.ClearReceivedCalls();
        GroupMediaObjectStorage.ClearReceivedCalls();
        UnitOfWorkGroups.ClearReceivedCalls();

        GroupsRepository
            .GetByIdAsync(Arg.Any<long>())
            .Returns((Group?)null);
        MusicGenresRepository
            .GetByIdAsync(Arg.Any<long>())
            .Returns((MusicGenre?)null);
        GroupMediaRepository
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupMedia, bool>>>())
            .Returns([]);
        GroupGenresRepository
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupGenre, bool>>>())
            .Returns([]);
        MusicGenresRepository
            .FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<MusicGenre, bool>>>())
            .Returns([]);
        GroupMediaObjectStorage
            .UploadObjectAsync(Arg.Any<string>(), Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(("https://cdn.test/uploaded-file.jpg", (string?)null));
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

            services.RemoveAll<IGroupMediaObjectStorage>();
            services.AddSingleton(GroupMediaObjectStorage);

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
