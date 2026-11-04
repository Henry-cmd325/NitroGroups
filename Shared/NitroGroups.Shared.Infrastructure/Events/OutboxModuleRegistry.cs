namespace NitroGroups.Shared.Infrastructure.Events
{
    /// <summary>
    /// Lista de DbContexts de módulo que tienen outbox. El <see cref="OutboxProcessor"/>
    /// la recorre para despachar los eventos pendientes de cada módulo.
    /// </summary>
    public sealed class OutboxModuleRegistry
    {
        private readonly List<Type> _contextTypes = [];

        public IReadOnlyList<Type> ContextTypes => _contextTypes;

        public void Register(Type contextType)
        {
            if (!_contextTypes.Contains(contextType))
                _contextTypes.Add(contextType);
        }
    }
}
