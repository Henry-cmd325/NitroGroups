using NitroGroups.Core.Users.Domain.Events;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions.Events;
using Microsoft.Extensions.Logging;

namespace NitroGroups.Core.Users.Application.Handlers
{
    public class UserCreatedDomainEventHandler : IDomainEventHandler<UserCreatedDomainEvent>
    {
        private readonly ILogger<UserCreatedDomainEventHandler> _logger;

        public UserCreatedDomainEventHandler(ILogger<UserCreatedDomainEventHandler> logger)
        {
            _logger = logger;
        }

        public async Task Handle(UserCreatedDomainEvent domainEvent, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Processing UserCreated domain event: UserId={UserId}, Email={Email}, Type={UserType}", 
                domainEvent.UserId, domainEvent.Email, domainEvent.UserType);

            // Aquí puedes agregar lógica de negocio adicional:
            // 1. Enviar email de bienvenida
            // 2. Crear perfil adicional si es BandMember
            // 3. Registrar métricas
            // 4. Actualizar caché
            // 5. Notificar a otros sistemas internos

            if (domainEvent.UserType == UserType.BandMember)
            {
                _logger.LogInformation("Band member created, triggering additional profile creation logic for UserId: {UserId}", 
                    domainEvent.UserId);
                
                // Aquí iría la lógica para crear perfil de músico
                // Por ahora solo logueamos
            }

            // Simular procesamiento asíncrono
            await Task.Delay(100, cancellationToken);
            
            _logger.LogInformation("UserCreated domain event processed successfully for UserId: {UserId}", 
                domainEvent.UserId);
        }
    }
}
