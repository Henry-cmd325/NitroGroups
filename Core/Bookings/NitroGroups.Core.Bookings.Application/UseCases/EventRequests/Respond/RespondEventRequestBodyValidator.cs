using FluentValidation;
using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Shared.Contracts.Bookings.Requests;

namespace NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Respond;

public sealed class RespondEventRequestBodyValidator : AbstractValidator<RespondEventRequestBody>
{
    public RespondEventRequestBodyValidator()
    {
        RuleFor(x => x.Message).MaximumLength(EventRequestMessage.MaxBodyLength)
            .WithMessage("El mensaje no puede pasar de 2000 caracteres.");
    }
}
