using AutoMapper;
using NitroGroups.Core.Users.Application.UseCases.Musicians.Create;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Application.Mappings
{
    public class MusicianProfile : Profile
    {
        public MusicianProfile()
        {
            CreateMap<Musician, MusicianDto>();
            CreateMap<MusicianProfileData, Musician>();
            CreateMap<CreateMusicianRequest, CreateMusicianCommand>();
            CreateMap<CreateMusicianCommand, Musician>()
                .ForMember(dest => dest.User, opt => opt.MapFrom(src =>
                     new User(src.UserInfo.Auth0Id, src.UserInfo.Email, src.UserInfo.FirstName, src.UserInfo.LastName, (UserType)src.UserInfo.UserType)))
                .ForMember(dest => dest.ShortBio, opt => opt.MapFrom(src => src.MusicianProfile.ShortBio))
                .ForMember(dest => dest.YearsExperience, opt => opt.MapFrom(src => src.MusicianProfile.YearsExperience))
                .ForMember(dest => dest.IsOpenToJoin, opt => opt.MapFrom(src => src.MusicianProfile.IsOpenToJoin));
        }
    }
}
