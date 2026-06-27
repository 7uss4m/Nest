using Microsoft.EntityFrameworkCore;
using Nest.Api.Extensions;
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
var swaggerKey     = builder.Configuration["Swagger:ApiKey"] ?? "";

var app = builder.Build();

// Apply pending migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NestDbContext>();
    await db.Database.MigrateAsync();
}

if (swaggerEnabled)
{
    app.Use(async (ctx, next) =>
    {
        if (ctx.Request.Path.StartsWithSegments("/swagger"))
        {
            var provided = ctx.Request.Query["key"].FirstOrDefault()
                        ?? ctx.Request.Headers["X-Swagger-Key"].FirstOrDefault();
            if (!string.IsNullOrEmpty(swaggerKey) && provided != swaggerKey)
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsync("Unauthorized");
                return;
            }
        }
        await next();
    });
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("nest");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
