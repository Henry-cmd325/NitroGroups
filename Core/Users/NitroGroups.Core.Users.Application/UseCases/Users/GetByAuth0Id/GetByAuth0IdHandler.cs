using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id
{
    public class GetByAuth0IdHandler : IQueryHandler<GetByAuth0IdQuery, UserDto?>
    {
        private readonly IUnitOfWorkUser _unitOfWork;
        private readonly IMapper _mapper;

        public GetByAuth0IdHandler(IUnitOfWorkUser unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<UserDto?> Handle(GetByAuth0IdQuery query, CancellationToken cancellationToken)
        {
            var users = await _unitOfWork.Users.FindAsync(u => u.Auth0Id == query.Auth0Id);
            var user = users.FirstOrDefault();

            if (user == null)
                return null;

            return _mapper.Map<UserDto>(user);
        }
    }
}
