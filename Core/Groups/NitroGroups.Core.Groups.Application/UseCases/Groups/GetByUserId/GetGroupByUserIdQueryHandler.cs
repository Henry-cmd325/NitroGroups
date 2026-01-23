using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId
{
    public record GetGroupByUserIdQuery(long UserId) : IQuery<Result<GroupResponse?>>;
    public class GetGroupByUserIdQueryHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : IQueryHandler<GetGroupByUserIdQuery, Result<GroupResponse?>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;
        public async Task<Result<GroupResponse?>> Handle(GetGroupByUserIdQuery query, CancellationToken cancellationToken)
        {
            var search = await _unitOfWork.Groups.FindAsync(g => g.Members.Any(m => m.UserId == query.UserId));
            var group = search.FirstOrDefault();

            if (group == null)
                return "No se encontro ningun grupo que perteneciera al usuario";

            return _mapper.Map<GroupResponse?>(group);
        }
    }
}
