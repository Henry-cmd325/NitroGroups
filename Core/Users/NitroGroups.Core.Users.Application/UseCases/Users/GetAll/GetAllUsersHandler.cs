using AutoMapper;
using Cortex.Mediator.Queries;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Users.Application.UseCases.Users.GetAll
{
    public class GetAllUsersHandler(IUnitOfWorkUser unitOfWork, IMapper mapper) : IQueryHandler<GetAllUsersQuery, PagedResult<UserDto>>
    {
        private readonly IUnitOfWorkUser _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<PagedResult<UserDto>> Handle(GetAllUsersQuery query, CancellationToken cancellationToken)
        {
            var result = await _unitOfWork.Users.GetPagedAsync(query.Page, query.Size);
            return new PagedResult<UserDto>(
                _mapper.Map<List<UserDto>>(result.Items),
                result.TotalCount,
                result.PageNumber,
                result.PageSize
            );
        }
    }
}
