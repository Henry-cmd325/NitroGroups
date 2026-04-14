using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id
{
    public record GetByAuth0IdQuery(string Auth0Id) : IQuery<UserDto?>;
}
