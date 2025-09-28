using AutoMapper;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Core.Users.Application.Mappings
{
    public class UserProfile : Profile
    {
        public UserProfile()
        {
            CreateMap<User, UserDto>();
        }
    }
}
