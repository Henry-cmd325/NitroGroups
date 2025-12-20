using Cortex.Mediator.Notifications;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Domain;
using System.Reflection;

namespace NitroGroups.Shared.Infrastructure.Events
{
    public class EventProvider : IEventProvider
    {
        private readonly Dictionary<string, Type> _eventTypes = [];
        public Type? GetEventTypeByName(string name)
        {
            _eventTypes.TryGetValue(name, out var type);

            return type;
        }

        public void RegisterEventsFromAssembly(Assembly assembly)
        {
            var notificationTypes = assembly
                .GetTypes()
                .Where(t => typeof(INotification).IsAssignableFrom(t) && !t.IsAbstract)
                .ToList();

            foreach (var type in notificationTypes) 
            {
                if (type.BaseType != null && typeof(IDomainEvent).IsAssignableFrom(type.BaseType))
                    _eventTypes.Add(type.BaseType.Name, type);
            }
        }
    }
}
