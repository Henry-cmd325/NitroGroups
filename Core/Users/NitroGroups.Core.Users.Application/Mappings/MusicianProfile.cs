using AutoMapper;
using NitroGroups.Core.Users.Application.UseCases.Musicians.Create;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.Mappings
{
    public class MusicianProfile : Profile
    {
        public MusicianProfile()
        {
            CreateMap<Musician, MusicianDto>();
            CreateMap<MusicianProfileData, Musician>();
            CreateMap<CreateMusicianRequest, CreateMusicianCommand>();
        }
    }
}
