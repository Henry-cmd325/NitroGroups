using AutoMapper;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Update;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Application.Mappings
{
    public class GroupProfile : Profile
    {
        public GroupProfile() 
        {
            CreateMap<UpdateGroupCommand, GroupResponse>();
        }
    }
}
