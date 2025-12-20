using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Domain.DomainEvents.Users;

namespace NitroGroups.Core.Users.Domain.Entities
﻿{
﻿    public class Musician : DomainModel
﻿    {
﻿        public long UserId { get; set; }
﻿        public int YearsExperience { get; set; }
﻿        public string? ShortBio { get; set; }
﻿        public bool IsOpenToJoin { get; set; }

        public virtual User User { get; set; } = null!;

        public void RaiseMusicianWithGroupCreatedEvent(int idGroup) =>
            AddDomainEvent(new MusicianWithGroupCreatedEvent(UserId, idGroup));
        
        public void RaiseSoloMusicianCreatedEvent(string groupName) =>
            AddDomainEvent(new SoloMusicianCreatedEvent(UserId, groupName));
    }
﻿}
﻿