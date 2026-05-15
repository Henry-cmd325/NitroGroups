using Cortex.Mediator.Commands;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Core.Groups.Application.UseCases.Songs.Add;

public record AddSongToGroupCommand(
    long GroupId,
    string TrackId) : ICommand<long>;

public class AddSongToGroupCommandHandler(IUnitOfWorkGroups unitOfWork) : ICommandHandler<AddSongToGroupCommand, long>
{
    public async Task<long> Handle(AddSongToGroupCommand command, CancellationToken cancellationToken)
    {
        var group = await unitOfWork.Groups.GetByIdAsync(command.GroupId);
        if (group == null)
            throw new Exception("Group not found");

        var song = new GroupSong
        {
            GroupId = command.GroupId,
            TrackId = command.TrackId
        };

        await unitOfWork.GroupSongs.CreateAsync(song);
        await unitOfWork.CompleteAsync();

        return song.Id;
    }
}
