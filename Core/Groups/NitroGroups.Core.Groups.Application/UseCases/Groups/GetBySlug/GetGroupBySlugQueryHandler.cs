using AutoMapper;
using Cortex.Mediator.Queries;
using Microsoft.EntityFrameworkCore;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.Infrastructure.Context;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.GetBySlug
{
    public record GetGroupBySlugQuery(string Slug) : IQuery<Result<GroupResponse>>;

    public class GetGroupBySlugQueryHandler(NitroGroupsContext context, IMapper mapper) : IQueryHandler<GetGroupBySlugQuery, Result<GroupResponse>>
    {
        private readonly NitroGroupsContext _context = context;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<GroupResponse>> Handle(GetGroupBySlugQuery query, CancellationToken cancellationToken)
        {
            var group = await _context.Groups
                .Include(g => g.Genres).ThenInclude(gg => gg.Genre)
                .Include(g => g.Media)
                .FirstOrDefaultAsync(g => g.Slug == query.Slug, cancellationToken);

            if (group is null)
                return "Group not found.";

            return _mapper.Map<GroupResponse>(group);
        }
    }
}