namespace NitroGroups.Core.Bookings.Application;

/// <summary>Tipo de error de un caso de uso; los endpoints lo traducen a un código HTTP.</summary>
public enum BookingErrorKind
{
    None = 0,
    /// <summary>400: datos inválidos.</summary>
    Validation,
    /// <summary>401: el usuario no está registrado.</summary>
    Unauthorized,
    /// <summary>403: es parte de la solicitud pero no puede hacer esta acción.</summary>
    Forbidden,
    /// <summary>404: no existe o no es parte de ella (no se revela su existencia).</summary>
    NotFound,
    /// <summary>409: el estado actual no permite la acción.</summary>
    Conflict
}

/// <summary>Resultado de los casos de uso de Bookings, con el tipo de error.</summary>
public sealed class BookingResult<T>
{
    private BookingResult(T? value, BookingErrorKind errorKind, string error)
    {
        Value = value;
        ErrorKind = errorKind;
        Error = error;
    }

    public T? Value { get; }
    public BookingErrorKind ErrorKind { get; }
    public string Error { get; }
    public bool IsSuccess => ErrorKind == BookingErrorKind.None;
    public bool IsFailure => !IsSuccess;

    public static BookingResult<T> Success(T value) => new(value, BookingErrorKind.None, string.Empty);
    public static BookingResult<T> Failure(BookingErrorKind kind, string error) => new(default, kind, error);

    public static BookingResult<T> NotFound() => Failure(BookingErrorKind.NotFound, "Solicitud no encontrada.");
}
