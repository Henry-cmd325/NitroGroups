using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public record CreateUserCommand(
        string Auth0Id,
        string Email,
        string FirstName,
        string LastName,
        UserType UserType) : ICommand<UserDto>;
}