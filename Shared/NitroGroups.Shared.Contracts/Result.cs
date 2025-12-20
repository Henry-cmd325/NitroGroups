namespace NitroGroups.Shared.Contracts
{
    public class Result<T>
    {
        public bool IsSuccess { get; }
        public bool IsFailure => !IsSuccess;
        public T? Value { get; }
        public string Error { get; }

        protected Result(T value)
        {
            IsSuccess = true;
            Value = value;
            Error = string.Empty;
        }

        protected Result(string error)
        {
            IsSuccess = false;
            Value = default;
            Error = error;
        }

        public static Result<T> Success(T value) => new(value);
        public static Result<T> Failure(string error) => new(error);

        public static implicit operator Result<T>(T value) => Success(value);
        public static implicit operator Result<T>(string error) => Failure(error);
    }
}
