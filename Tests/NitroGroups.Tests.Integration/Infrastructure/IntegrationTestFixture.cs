using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.Mappings;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Groups.Infrastructure;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Infrastructure;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Application.Mappings;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Core.Users.Infrastructure;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Repository;
using NSubstitute;

namespace NitroGroups.Tests.Integration.Infrastructure;

public sealed class IntegrationTestFixture : IDisposable
{
    public NitroGroupsContext CreateContext()
    {
        var databaseName = $"NitroGroupsTests_{Guid.NewGuid():N}";
        var options = new DbContextOptionsBuilder<NitroGroupsContext>()
            .UseInMemoryDatabase(databaseName)
            .EnableSensitiveDataLogging()
            .Options;

        var context = new NitroGroupsContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    public IMapper CreateMapper()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAutoMapper(cfg =>
        {
            cfg.AddProfile<UserProfile>();
            cfg.AddProfile<MusicianProfile>();
            cfg.AddProfile<GroupProfile>();
        });

        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IMapper>();
    }

    public IUnitOfWorkUser CreateUsersUnitOfWork(NitroGroupsContext context)
    {
        var outbox = Substitute.For<IOutboxService>();
        var groupIntegration = Substitute.For<IGroupIntegrationService>();
        return CreateUsersUnitOfWork(context, outbox, groupIntegration);
    }

    public IUnitOfWorkUser CreateUsersUnitOfWork(
        NitroGroupsContext context,
        IOutboxService outbox,
        IGroupIntegrationService groupIntegration)
    {
        var users = new GenericRepository<User, long>(context);
        var musicians = new GenericRepository<Musician, long>(context);

        return new UnitOfWorkUser(context, outbox, users, musicians, groupIntegration);
    }

    public IUnitOfWorkGroups CreateGroupsUnitOfWork(NitroGroupsContext context)
    {
        var outbox = Substitute.For<IOutboxService>();
        var groups = new GenericRepository<Group, long>(context);
        var members = new GenericRepository<GroupMember, long>(context);
        var genres = new GenericRepository<MusicGenre, long>(context);
        var groupGenres = new GenericRepository<GroupGenre, long>(context);
        var media = new GenericRepository<GroupMedia, long>(context);

        return new UnitOfWorkGroups(context, outbox, groups, members, genres, groupGenres, media);
    }

    public IUnitOfWorkSchedules CreateSchedulesUnitOfWork(NitroGroupsContext context)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => context);
        services.AddSchedulesInfrastructure();

        var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IUnitOfWorkSchedules>();
    }

    public void Dispose()
    {
    }
}
