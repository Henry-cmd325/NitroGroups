using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Application.Abstractions.Services
{
    public interface IAuthenticationService
    {
        Task ActualizarTipoUsuario(string auth0UserId, UserType tipoUsuario);
    }
}