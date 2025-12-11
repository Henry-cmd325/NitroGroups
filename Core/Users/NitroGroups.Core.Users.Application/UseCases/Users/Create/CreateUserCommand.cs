using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public record CreateUserCommand(
        string Auth0Id,
        string Email,
        string FirstName,
        string LastName,
        UserType UserType) : ICommand<UserDto>;
}