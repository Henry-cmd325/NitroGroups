using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Shared.Paging;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetAll
{
    public class GetAllUsersHandler(IUserService userService, IMapper mapper) : IQueryHandler<GetAllUsersQuery, PagedResult<UserDto>>
    {
        private readonly IUserService _userService = userService;
        private readonly IMapper _mapper = mapper;

        public async Task<PagedResult<UserDto>> Handle(GetAllUsersQuery query, CancellationToken cancellationToken)
        {
            var result = await _userService.GetPagedAsync(query.Page, query.Size);
            return new PagedResult<UserDto>(
                _mapper.Map<List<UserDto>>(result.Items),
                result.TotalCount,
                result.PageNumber,
                result.PageSize
            );
        }
    }
}
