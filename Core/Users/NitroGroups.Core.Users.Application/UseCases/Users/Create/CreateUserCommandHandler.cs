using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public class CreateUserCommandHandler(IUnitOfWorkUser unitOfWork, IMapper mapper) : ICommandHandler<CreateUserCommand, UserDto>
    {
        private readonly IUnitOfWorkUser _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<UserDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var newUser = _mapper.Map<User>(request);

            await _unitOfWork.Users.CreateAsync(newUser);
            await _unitOfWork.CompleteAsync();
            
            var dto = _mapper.Map<UserDto>(newUser);

            return dto;
        }
    }
}