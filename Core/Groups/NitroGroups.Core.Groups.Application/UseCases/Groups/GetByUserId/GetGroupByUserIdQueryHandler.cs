using AutoMapper;
using Cortex.Mediator.Queries;
using Microsoft.EntityFrameworkCore;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.Infrastructure.Context;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId
{
    public record GetGroupByUserIdQuery(long UserId) : IQuery<Result<GroupResponse?>>;
    public class GetGroupByUserIdQueryHandler(NitroGroupsContext context, IMapper mapper) : IQueryHandler<GetGroupByUserIdQuery, Result<GroupResponse?>>
    {
        private readonly NitroGroupsContext _context = context;
        private readonly IMapper _mapper = mapper;
        public async Task<Result<GroupResponse?>> Handle(GetGroupByUserIdQuery query, CancellationToken cancellationToken)
        {
            var group = await _context.Groups
                .Include(g => g.Genres).ThenInclude(gg => gg.Genre)
                .Include(g => g.Media)
                .FirstOrDefaultAsync(g => g.Members.Any(m => m.UserId == query.UserId), cancellationToken);

            if (group == null)
                return "No se encontro ningun grupo que perteneciera al usuario";

            return _mapper.Map<GroupResponse?>(group);
        }
    }
}
