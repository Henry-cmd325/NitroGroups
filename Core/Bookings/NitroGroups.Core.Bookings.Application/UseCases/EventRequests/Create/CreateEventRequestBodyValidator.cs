using FluentValidation;
using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Shared.Contracts.Bookings.Requests;

namespace NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Create;

public sealed class CreateEventRequestBodyValidator : AbstractValidator<CreateEventRequestBody>
{
    public CreateEventRequestBodyValidator()
    {
        RuleFor(x => x.GroupId).GreaterThan(0).WithMessage("Indica el grupo.");
        RuleFor(x => x.EventDate).NotEqual(default(DateOnly)).WithMessage("Indica la fecha del evento.");
        RuleFor(x => x.DurationHours).InclusiveBetween(1, 12).WithMessage("La duración debe ser de 1 a 12 horas.");
        RuleFor(x => x.EventType).NotEmpty().WithMessage("Indica el tipo de evento.")
            .MaximumLength(50).WithMessage("El tipo de evento no puede pasar de 50 caracteres.");
        RuleFor(x => x.LocationText).NotEmpty().WithMessage("Indica el lugar del evento.")
            .MaximumLength(300).WithMessage("El lugar no puede pasar de 300 caracteres.");
        RuleFor(x => x.GuestCount).GreaterThan(0).When(x => x.GuestCount.HasValue)
            .WithMessage("El número de invitados debe ser mayor que cero.");
        RuleFor(x => x.Budget).GreaterThanOrEqualTo(0).When(x => x.Budget.HasValue)
            .WithMessage("El presupuesto no puede ser negativo.")
            .LessThan(10_000_000_000m).When(x => x.Budget.HasValue)
            .WithMessage("El presupuesto es demasiado grande.");
        RuleFor(x => x.Message).Must(m => (m?.Trim().Length ?? 0) is >= 10 and <= EventRequestMessage.MaxBodyLength)
            .WithMessage("El mensaje debe tener entre 10 y 2000 caracteres.");
    }
}
