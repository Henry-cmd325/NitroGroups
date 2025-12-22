using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;

namespace NitroGroups.Core.Users.Application.UseCases.Musicians.Create
{
    public record CreateMusicianCommand(
        UserInfoData UserInfo, 
        MusicianProfileData MusicianProfile, 
        int IdGroup) : ICommand<Result<MusicianDto>>;
    
    public class CreateMusicianCommandHandler(IUnitOfWorkUser unitOfWork, IMapper mapper) : ICommandHandler<CreateMusicianCommand, Result<MusicianDto>>
    {
        private readonly IUnitOfWorkUser _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<MusicianDto>> Handle(CreateMusicianCommand command, CancellationToken cancellationToken)
        {
            var newMusician = _mapper.Map<Musician>(command);
            await _unitOfWork.Musicians.CreateAsync(newMusician);

            if (command.IdGroup != 0)
            {
                var groupExists = await _unitOfWork.GroupIntegrationService.CheckIfGroupExists(command.IdGroup);
                if (!groupExists)
                    return "El grupo al que se queria unir ya no existe";

                newMusician.RaiseMusicianWithGroupCreatedEvent(command.IdGroup);
            }

            await _unitOfWork.OutboxService.SaveEventsAsync(newMusician.DomainEvents);
            await _unitOfWork.CompleteAsync();

            return _mapper.Map<Musician, MusicianDto>(newMusician);
        }
    }
}