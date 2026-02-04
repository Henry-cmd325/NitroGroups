using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.GetBySlug
{
    public record GetGroupBySlugQuery(string Slug) : IQuery<Result<GroupResponse>>;

    public class GetGroupBySlugQueryHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : IQueryHandler<GetGroupBySlugQuery, Result<GroupResponse>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<GroupResponse>> Handle(GetGroupBySlugQuery query, CancellationToken cancellationToken)
        {
            var groups = await _unitOfWork.Groups.FindAsync(group => group.Slug == query.Slug);
            var group = groups.FirstOrDefault();

            if (group is null)
                return "Group not found.";

            return _mapper.Map<GroupResponse>(group);
        }
    }
}