using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Sync
{
    public class SyncUserCommandHandler : ICommandHandler<SyncUserCommand, UserDto>
    {
        private readonly IUnitOfWorkUser _unitOfWork;
        private readonly IMapper _mapper;

        public SyncUserCommandHandler(IUnitOfWorkUser unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<UserDto> Handle(SyncUserCommand command, CancellationToken cancellationToken)
        {
            // Check if user already exists
            var existingUsers = await _unitOfWork.Users.FindAsync(u => u.Auth0Id == command.Auth0Id);
            var existingUser = existingUsers.FirstOrDefault();

            if (existingUser != null)
            {
                // User exists - update last login
                existingUser.UpdateLastLogin();
                _unitOfWork.Users.Update(existingUser);
                await _unitOfWork.CompleteAsync();

                return _mapper.Map<UserDto>(existingUser);
            }

            // User doesn't exist - create new
            var newUser = new User(
                auth0Id: command.Auth0Id,
                email: command.Email,
                firstName: command.FirstName,
                lastName: command.LastName,
                userType: command.UserType
            );

            if (!string.IsNullOrEmpty(command.ProfilePictureUrl))
            {
                newUser.UpdateProfilePicture(command.ProfilePictureUrl);
            }

            await _unitOfWork.Users.CreateAsync(newUser);
            await _unitOfWork.CompleteAsync();

            return _mapper.Map<UserDto>(newUser);
        }
    }
}
