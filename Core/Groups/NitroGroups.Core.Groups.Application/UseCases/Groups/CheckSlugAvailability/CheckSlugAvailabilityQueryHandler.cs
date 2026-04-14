using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.CheckSlugAvailability
{
    public record CheckSlugAvailabilityQuery(string Slug) : IQuery<Result<bool>>;

    public class CheckSlugAvailabilityQueryHandler(IUnitOfWorkGroups unitOfWork) : IQueryHandler<CheckSlugAvailabilityQuery, Result<bool>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;

        public async Task<Result<bool>> Handle(CheckSlugAvailabilityQuery query, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(query.Slug))
                return "Slug cannot be empty.";

            var existing = await _unitOfWork.Groups.FindAsync(g => g.Slug == query.Slug);
            var available = !existing.Any();

            return available;
        }
    }
}
