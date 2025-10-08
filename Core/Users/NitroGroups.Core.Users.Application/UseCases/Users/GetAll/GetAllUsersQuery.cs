using Cortex.Mediator.Queries;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Shared.Paging;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetAll
{
    public class GetAllUsersQuery : IQuery<PagedResult<UserDto>> 
    {
        public int Page { get; set; }
        public int Size { get; set; }
    }
}
