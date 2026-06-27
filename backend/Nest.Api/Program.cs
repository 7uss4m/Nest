using Microsoft.EntityFrameworkCore;
using Nest.Api.Extensions;
using Nest.Application.Auth;
using Nest.Infrastructure;
using Nest.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();

builder.Services.AddCors(opts => opts.AddPolicy("nest", policy =>
    policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var swaggerEnabled = builder.Configuration["Swagger:Enabled"] == "true";

var app = builder.Build();

// Apply pending migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NestDbContext>();
    await db.Database.MigrateAsync();
}

if (swaggerEnabled)
{
    // Guard: everything except /api/* and /login* requires a valid swagger_auth cookie
    app.Use(async (ctx, next) =>
    {
        var path = ctx.Request.Path;
        if (!path.StartsWithSegments("/api") && !path.StartsWithSegments("/login"))
        {
            var cookieKey = ctx.Request.Cookies["swagger_auth"];
            if (!string.IsNullOrEmpty(cookieKey))
            {
                var svc = ctx.RequestServices.GetRequiredService<IApiKeyService>();
                if (await svc.ValidateAsync(cookieKey) is not null) { await next(); return; }
                ctx.Response.Cookies.Delete("swagger_auth");
            }
            ctx.Response.Redirect("/login");
            return;
        }
        await next();
    });

    app.UseSwagger();
    app.UseSwaggerUI(opts =>
    {
        opts.RoutePrefix = "";
        opts.SwaggerEndpoint("/swagger/v1/swagger.json", "Nest API v1");
    });

    app.MapGet("/login", (HttpRequest req) =>
        Results.Content(SwaggerLoginPage.Html(req.Query.ContainsKey("error")), "text/html; charset=utf-8"));

    app.MapPost("/login", async (HttpContext ctx, IApiKeyService svc) =>
    {
        var form = await ctx.Request.ReadFormAsync();
        var raw = form["key"].FirstOrDefault() ?? "";
        var userId = await svc.ValidateAsync(raw);
        if (userId is null) return Results.Redirect("/login?error=1");
        ctx.Response.Cookies.Append("swagger_auth", raw, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8),
        });
        return Results.Redirect("/");
    });
}

app.UseCors("nest");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
