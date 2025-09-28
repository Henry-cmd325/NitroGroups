using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Core.Users.Application.Abstractions.Services
{
    public interface IUserService
    {
        public Task<User> GetByIdAsync(int id);
        public Task<List<User>> GetAllAsync();
    }
}
