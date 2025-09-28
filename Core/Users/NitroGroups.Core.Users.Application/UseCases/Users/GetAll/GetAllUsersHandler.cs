using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Application.Dtos;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetAll
{
    public class GetAllUsersHandler(IUserService userService, IMapper mapper) : IQueryHandler<GetAllUsersQuery, List<UserDto>>
    {
        private readonly IUserService _userService = userService;
        private readonly IMapper _mapper = mapper;

        public async Task<List<UserDto>> Handle(GetAllUsersQuery query, CancellationToken cancellationToken)
        {
            var list = await _userService.GetAllAsync();

            return _mapper.Map<List<UserDto>>(list); 
        }
    }
}
