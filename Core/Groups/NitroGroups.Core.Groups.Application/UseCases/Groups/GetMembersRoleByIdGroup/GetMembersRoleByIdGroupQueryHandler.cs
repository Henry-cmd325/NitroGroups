using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using System.Linq;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.GetMembersRoleByIdGroup
{
    public record GetMembersRoleByIdGroupQuery(long GroupId) : IQuery<Result<List<GroupMemberResponse>>>;

    public class GetMembersRoleByIdGroupQueryHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : IQueryHandler<GetMembersRoleByIdGroupQuery, Result<List<GroupMemberResponse>>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<List<GroupMemberResponse>>> Handle(GetMembersRoleByIdGroupQuery query, CancellationToken cancellationToken)
        {
            var members = await _unitOfWork.GroupMembers.FindAsync(member => member.GroupId == query.GroupId);
            var membersList = members.ToList();

            if (membersList.Count == 0)
                return "No se encontraron miembros para el grupo";

            return _mapper.Map<List<GroupMemberResponse>>(membersList);
        }
    }
}
