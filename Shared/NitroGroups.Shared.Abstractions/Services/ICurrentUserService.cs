using System;
using System.Collections.Generic;
using System.Text;

namespace NitroGroups.Shared.Abstractions.Services
{
    public interface ICurrentUserService
    {
        public long? GetUserId();
    }
}
