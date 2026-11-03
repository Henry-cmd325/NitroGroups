using FluentValidation;
using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Shared.Contracts.Bookings.Requests;

namespace NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Messages;

public sealed class PostEventRequestMessageBodyValidator : AbstractValidator<PostEventRequestMessageBody>
{
    public PostEventRequestMessageBodyValidator()
    {
        RuleFor(x => x.Body).Must(b => !string.IsNullOrWhiteSpace(b)).WithMessage("El mensaje no puede estar vacío.")
            .MaximumLength(EventRequestMessage.MaxBodyLength).WithMessage("El mensaje no puede pasar de 2000 caracteres.");
    }
}
