using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public class CreateUserCommandHandler(IUserService userService, IMapper mapper) : ICommandHandler<CreateUserCommand, UserDto>
    {
        private readonly IUserService _userService = userService;
        private readonly IMapper _mapper = mapper;

        public async Task<UserDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var result = await _userService.CreateAsync(_mapper.Map<User>(request));

            return _mapper.Map<UserDto>(result);
        }
    }
}