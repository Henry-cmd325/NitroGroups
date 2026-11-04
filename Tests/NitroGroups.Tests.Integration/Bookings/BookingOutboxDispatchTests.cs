using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Core.Bookings.Application.Events;
using NitroGroups.Core.Bookings.Infrastructure.Persistence;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Modules;
using NitroGroups.Shared.Domain.DomainEvents.Bookings;
using NitroGroups.Shared.Infrastructure.Events;
using NitroGroups.Tests.Integration.Infrastructure;
using NSubstitute;
using static NitroGroups.Tests.Integration.Bookings.BookingsTestScenario;

namespace NitroGroups.Tests.Integration.Bookings;

/// <summary>
/// Camino completo de S10: el evento guardado en el outbox de Bookings se deserializa al tipo
/// INotification del módulo y su handler (registrado por AddBookingsApplication) manda el email.
/// </summary>
public class BookingOutboxDispatchTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public BookingOutboxDispatchTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task EventoCreadoEnElOutbox_AlProcesarse_EnviaElEmailALosManagers()
    {
        var scenario = new BookingsTestScenario();
        var email = Substitute.For<IEmailSender>();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddBookingsApplication(new ConfigurationBuilder().Build());
        services.AddSingleton(scenario.Groups);
        services.AddSingleton(scenario.Users);
        services.AddSingleton(email);
        await using var provider = services.BuildServiceProvider();

        var eventProvider = new EventProvider();
        eventProvider.RegisterEventsFromAssembly(typeof(BookingEvents).Assembly);

        await using var context = _fixture.CreateBookingsContext();
        var outbox = new OutboxService<BookingsDbContext>(
            context, NullLogger<OutboxService<BookingsDbContext>>.Instance, provider, eventProvider);

        await outbox.SaveEventAsync(new EventRequestCreatedEvent
        {
            EventRequestId = 1, GroupId = GroupId, ClientUserId = ClientId, EventDate = new DateOnly(2026, 12, 12), EventKind = "Boda"
        });
        await outbox.ProcessPendingEventsAsync();

        await email.Received(1).SendAsync("manager@vargas.mx", "Nueva solicitud de evento: Boda el 12/12/2026", Arg.Any<string>(), Arg.Any<CancellationToken>());
        var saved = Assert.Single(context.OutboxEvents);
        Assert.True(saved.Processed, saved.LastError);
    }
}
