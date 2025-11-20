using NitroGroups.Shared.Abstractions.Events;
using System.Reflection;

namespace NitroGroups.Shared.Infrastructure.Events
{
    public class EventProvider : IEventProvider
    {
        private static readonly Dictionary<string, Type> _eventTypes = [];
        public Type? GetEventTypeByName(string name)
        {
            _eventTypes.TryGetValue(name, out var type);

            return type;
        }

        public void RegisterEventsFromAssembly(Assembly assembly)
        {
            var eventTypes = assembly.GetTypes()
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IDomainEvent).IsAssignableFrom(t));

            foreach (var eventType in eventTypes)
            {
                var constructor = eventType.GetConstructors().First();
                var parameters = constructor.GetParameters();
                var parameterValues = new object?[parameters.Length];
                for (int i = 0; i < parameters.Length; i++)
                {
                    parameterValues[i] = GetDefaultValue(parameters[i].ParameterType);
                }

                var eventInstance = (IDomainEvent)constructor.Invoke(parameterValues);
                _eventTypes.TryAdd(eventInstance.EventType, eventType);
            }
        }

        private static object? GetDefaultValue(Type t)
        {
            if (t.IsValueType)
            {
                return Activator.CreateInstance(t);
            }
            return null;
        }
    }
}
