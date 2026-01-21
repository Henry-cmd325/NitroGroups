using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Shared.Infrastructure.Context;

namespace NitroGroups.Core.Users.Infrastructure.Adapters
{
    public class GroupIntegrationMonolith(NitroGroupsContext context) : IGroupIntegrationService
    {
        private readonly NitroGroupsContext _context = context;

        public Task<bool> CheckIfGroupExists(int id)
        {
            return _context.Groups.AnyAsync(g => g.Id == id);
        }
    }
}
