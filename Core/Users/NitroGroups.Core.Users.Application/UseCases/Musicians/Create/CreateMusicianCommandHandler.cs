using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Musicians.Create
{
    public record CreateMusicianCommand(
        UserInfoData UserInfo, 
        MusicianProfileData MusicianProfile, 
        int IdGroup) : ICommand<MusicianDto>;
    
    public class CreateMusicianCommandHandler(IUnitOfWorkUser unitOfWork, IMapper mapper) : ICommandHandler<CreateMusicianCommand, MusicianDto>
    {
        private readonly IUnitOfWorkUser _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<MusicianDto> Handle(CreateMusicianCommand command, CancellationToken cancellationToken)
        {
            var newMusician = _mapper.Map<Musician>(command);
            
            if (command.IdGroup != 0)
            {
                await _unitOfWork.Musicians.CreateAsync(newMusician);
                await _unitOfWork.CompleteAsync();

                return _mapper.Map<Musician, MusicianDto>(newMusician);
            }



            var resdfsponse = new MusicianDto();
            return await Task.FromResult(resdfsponse);
        }
    }
}
