using NitroGroups.Shared.Abstractions;
﻿
﻿namespace NitroGroups.Core.Users.Domain.Entities
﻿{
﻿    public class Musician : DomainModel
﻿    {
        public long Id { get; set; }
﻿        public long UserId { get; set; }
﻿        public int YearsExperience { get; set; }
﻿        public string? ShortBio { get; set; }
﻿        public bool IsOpenToJoin { get; set; }

        public virtual User User { get; set; } = null!;
﻿    }
﻿}
﻿