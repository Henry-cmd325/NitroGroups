using AutoMapper;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Create;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Update;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Contracts.Groups.Requests;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Application.Mappings
{
    public class GroupProfile : Profile
    {
        public GroupProfile() 
        {
            CreateMap<UpdateGroupRequest, UpdateGroupCommand>()
            .ConstructUsing((src, ctx) => new UpdateGroupCommand(
                (long)ctx.Items["Id"],
                src.Slug,
                src.GroupName,
                src.Description,
                src.Biography,
                src.NumMembers,
                src.YearsExperience,
                src.Phone,
                src.Email,
                src.LocationText,
                src.ServiceRadiusKm,
                src.Currency,
                src.BasePrice,
                src.HourlyRate,
                src.MinimumDurationHours,
                src.SetupTimeMinutes,
                src.IsAcceptingBookings,
                src.ProfilePictureUrl,
                src.CoverImageUrl));

            CreateMap<UpdateGroupCommand, Group>();
            CreateMap<UpdateGroupCommand, GroupResponse>();
            
            // Create maps
            CreateMap<CreateGroupRequest, CreateGroupCommand>()
                .ConstructUsing(src => new CreateGroupCommand(
                    src.OwnerUserId,
                    src.Slug,
                    src.GroupName,
                    src.Description,
                    src.Biography,
                    src.NumMembers,
                    src.YearsExperience,
                    src.Phone,
                    src.Email,
                    src.LocationText,
                    src.ServiceRadiusKm,
                    src.Currency,
                    src.BasePrice,
                    src.HourlyRate,
                    src.MinimumDurationHours,
                    src.SetupTimeMinutes,
                    src.IsAcceptingBookings,
                    src.Active));

            CreateMap<CreateGroupCommand, Group>();

            CreateMap<GroupMember, GroupMemberResponse>();
            CreateMap<Group, GroupResponse>();

            // Genre & Media maps
            CreateMap<GroupGenre, GenreResponse>()
                .ForMember(d => d.Id, o => o.MapFrom(s => s.Genre.Id))
                .ForMember(d => d.Name, o => o.MapFrom(s => s.Genre.Name))
                .ForMember(d => d.Slug, o => o.MapFrom(s => s.Genre.Slug))
                .ForMember(d => d.ColorHex, o => o.MapFrom(s => s.Genre.ColorHex))
                .ForMember(d => d.IsPrimary, o => o.MapFrom(s => s.IsPrimary));

            CreateMap<GroupMedia, GroupMediaResponse>()
                .ForMember(d => d.Type, o => o.MapFrom(s => s.Type.ToString().ToLower()));

            CreateMap<MusicGenre, GenreListResponse>();
        }
    }
}

