using System;

namespace NitroGroups.Core.Availability.Domain.Entities
{
    public class Availability
    {
        private Availability() { }

        public static Availability Create(int id, string status, long timestamp)
        {
            return new Availability
            {
                Id = id,
                Status = status,
                Timestamp = timestamp
            };
        }

        public int Id { get; private set; }
        public string Status { get; private set; }
        public long Timestamp { get; private set; }

        public void UpdateStatus(string newStatus)
        {
            if (string.IsNullOrEmpty(newStatus))
            {
                throw new ArgumentException("El nuevo estado no puede ser vacío", nameof(newStatus));
            }

            Status = newStatus;
        }
    }
}