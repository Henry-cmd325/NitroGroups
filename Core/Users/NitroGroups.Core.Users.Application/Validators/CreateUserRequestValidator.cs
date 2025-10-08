using FluentValidation;
using NitroGroups.Core.Users.Application.Dtos.Requests;

namespace NitroGroups.Core.Users.Application.Validators
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