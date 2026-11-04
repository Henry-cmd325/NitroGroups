using Cortex.Mediator.DependencyInjection;
using Cortex.Mediator.Notifications;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NitroGroups.Core.Bookings.Application.EventHandlers;
using NitroGroups.Core.Bookings.Application.Events;

namespace NitroGroups.Core.Bookings.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddBookingsApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddCortexMediator([typeof(DependencyInjection)]);

        services.TryAddSingleton(TimeProvider.System);

        services.AddScoped<BookingEmailRecipients>();
        services.AddScoped<INotificationHandler<BookingEvents.EventRequestCreatedEvent>, EventRequestCreatedEmailHandler>();
        services.AddScoped<INotificationHandler<BookingEvents.EventRequestStatusChangedEvent>, EventRequestStatusChangedEmailHandler>();
        services.AddScoped<INotificationHandler<BookingEvents.EventRequestMessagePostedEvent>, EventRequestMessagePostedEmailHandler>();

        return services;
    }
}
