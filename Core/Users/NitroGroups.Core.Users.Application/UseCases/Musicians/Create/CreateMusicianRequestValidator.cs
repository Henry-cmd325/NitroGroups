using FluentValidation;
using NitroGroups.Shared.Contracts.Users.Requests;

namespace NitroGroups.Core.Users.Application.UseCases.Musicians.Create;

public class CreateMusicianRequestValidator : AbstractValidator<CreateMusicianRequest>
{
    public CreateMusicianRequestValidator()
    {
        RuleFor(x => x.UserInfo)
            .NotNull()
            .SetValidator(new UserInfoDataValidator());

        RuleFor(x => x.MusicianProfile)
            .NotNull()
            .SetValidator(new MusicianProfileDataValidator());

        RuleFor(x => x.IdGroup)
            .GreaterThanOrEqualTo(0)
            .WithMessage("IdGroup must be a non-negative value.");
    }
}

public class UserInfoDataValidator : AbstractValidator<UserInfoData>
{
    public UserInfoDataValidator()
    {
        RuleFor(x => x.Auth0Id)
            .NotEmpty()
            .WithMessage("Auth0Id cannot be empty.")
            .MaximumLength(100)
            .WithMessage("Auth0Id cannot exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email cannot be empty.")
            .EmailAddress()
            .WithMessage("Invalid email format.")
            .MaximumLength(150)
            .WithMessage("Email cannot exceed 150 characters.");

        RuleFor(x => x.FirstName)
            .NotEmpty()
            .WithMessage("FirstName cannot be empty.")
            .MaximumLength(100)
            .WithMessage("FirstName cannot exceed 100 characters.");

        RuleFor(x => x.LastName)
            .NotEmpty()
            .WithMessage("LastName cannot be empty.")
            .MaximumLength(100)
            .WithMessage("LastName cannot exceed 100 characters.");

        RuleFor(x => x.Phone)
            .MaximumLength(20)
            .WithMessage("Phone cannot exceed 20 characters.");
    }
}

public class MusicianProfileDataValidator : AbstractValidator<MusicianProfileData>
{
    public MusicianProfileDataValidator()
    {
        RuleFor(x => x.ShortBio)
            .MaximumLength(800)
            .WithMessage("ShortBio cannot exceed 800 characters.");

        RuleFor(x => x.YearsExperience)
            .GreaterThanOrEqualTo(0)
            .WithMessage("YearsExperience must be a non-negative value.");
    }
}