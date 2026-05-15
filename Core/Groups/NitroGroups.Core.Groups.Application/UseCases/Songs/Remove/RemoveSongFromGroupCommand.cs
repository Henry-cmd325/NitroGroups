using Cortex.Mediator.Commands;
using NitroGroups.Core.Groups.Application.Abstractions;

namespace NitroGroups.Core.Groups.Application.UseCases.Songs.Remove;

public record RemoveSongFromGroupCommand(long Id) : ICommand<bool>;

public class RemoveSongFromGroupCommandHandler(IUnitOfWorkGroups unitOfWork) : ICommandHandler<RemoveSongFromGroupCommand, bool>
{
    public async Task<bool> Handle(RemoveSongFromGroupCommand command, CancellationToken cancellationToken)
    {
        var song = await unitOfWork.GroupSongs.GetByIdAsync(command.Id);
        if (song == null)
            return false;

        unitOfWork.GroupSongs.Delete(song);
        await unitOfWork.CompleteAsync();

        return true;
    }
}
