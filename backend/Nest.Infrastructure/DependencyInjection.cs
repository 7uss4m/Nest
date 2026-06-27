using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nest.Application.Auth;
using Nest.Application.Notifications;
using Nest.Application.Common;
using Nest.Infrastructure.Data;
using Nest.Infrastructure.Services;

namespace Nest.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        services.AddDbContext<NestDbContext>(opts =>
            opts.UseNpgsql(config.GetConnectionString("Postgres"),
                b => b.MigrationsAssembly(typeof(NestDbContext).Assembly.FullName)));

        services.AddScoped<INestDbContext>(sp =>
            (INestDbContext)sp.GetRequiredService<NestDbContext>());

        services.AddIdentityCore<AppUser>(opts =>
        {
            opts.Password.RequiredLength = 8;
            opts.Password.RequireNonAlphanumeric = false;
            opts.User.RequireUniqueEmail = true;
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddEntityFrameworkStores<NestDbContext>()
        .AddDefaultTokenProviders()
        .AddSignInManager();

        services.AddScoped<ITokenService, TokenService>();
        services.AddHttpClient("ntfy");
        services.AddScoped<INtfyService, NtfyService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddSingleton<IMinioService, MinioService>();
        services.AddHostedService<SchedulerService>();

        return services;
    }
}
