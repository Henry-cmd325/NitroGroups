using AutoMapper;
using NitroGroups.Core.Users.Application.UseCases.Users.Create;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.Mappings
{
    public class UserProfile : Profile
    {
        public UserProfile()
        {
            CreateMap<User, UserDto>();
            CreateMap<CreateUserCommand, User>();
            CreateMap<CreateUserRequest, CreateUserCommand>();
            CreateMap<UserInfoData, User>();
        }
    }
}
