using FluentValidation;
using NitroGroups.Shared.Contracts.Users.Requests;

namespace NitroGroups.Core.Users.Application.UseCases.Users.Create
{
    public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
    {
        public CreateUserRequestValidator()
        {
            RuleFor(x => x.Auth0Id).NotEmpty();
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.FirstName).NotEmpty();
            RuleFor(x => x.LastName).NotEmpty();
            RuleFor(x => x.UserType).IsInEnum();
        }
    }
}