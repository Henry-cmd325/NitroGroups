using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public class CreateUserCommandHandler : ICommandHandler<CreateUserCommand, User>
    {
        private readonly IUserService _userService;

        public CreateUserCommandHandler(IUserService userService)
        {
            _userService = userService;
        }

        public async Task<User> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var user = new User(
                auth0Id: request.Auth0Id,
                email: request.Email,
                firstName: request.FirstName,
                lastName: request.LastName,
                userType: request.UserType);

            return await _userService.CreateAsync(user);
        }
    }
}