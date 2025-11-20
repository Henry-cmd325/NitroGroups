using System.Reflection;

namespace NitroGroups.Shared.Abstractions.Events
{
    public interface IEventProvider
    {
        public void RegisterEventsFromAssembly(Assembly assembly);
        public Type? GetEventTypeByName(string name);
    }
}
