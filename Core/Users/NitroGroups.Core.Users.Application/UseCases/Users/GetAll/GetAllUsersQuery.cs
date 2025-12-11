using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetAll
{
    public class GetAllUsersQuery : IQuery<PagedResult<UserDto>> 
    {
        public int Page { get; set; }
        public int Size { get; set; }
    }
}
