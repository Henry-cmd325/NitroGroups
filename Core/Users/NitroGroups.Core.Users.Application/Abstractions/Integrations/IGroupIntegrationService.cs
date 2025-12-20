namespace NitroGroups.Core.Users.Application.Abstractions.Integrations
{
    public interface IGroupIntegrationService
    {
        public Task<bool> CheckIfGroupExists(int id);
    }
}
