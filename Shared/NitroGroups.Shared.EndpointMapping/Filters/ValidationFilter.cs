using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace NitroGroups.Shared.EndpointMapping.Filters
{
    public class ValidationFilter<T> : IEndpointFilter where T : class
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var validator = context.HttpContext.RequestServices.GetService<IValidator<T>>();
            if (validator is null)
            {
                return await next(context);
            }

            var argument = context.Arguments.FirstOrDefault(a => a?.GetType() == typeof(T)) as T;

            if (argument is null)
            {
                // This should not happen if the filter is applied correctly
                return Results.Problem("Validation target not found.", statusCode: 500);
            }

            var validationResult = await validator.ValidateAsync(argument);

            if (!validationResult.IsValid)
            {
                return Results.ValidationProblem(validationResult.ToDictionary());
            }

            return await next(context);
        }
    }
}