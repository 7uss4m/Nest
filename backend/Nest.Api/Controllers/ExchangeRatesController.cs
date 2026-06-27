using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/exchange-rates")]
[Authorize]
public class ExchangeRatesController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Returns the most recent rate for every currency pair.</summary>
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rates = await db.ExchangeRates
            .GroupBy(r => new { r.BaseCurrency, r.TargetCurrency })
            .Select(g => g.OrderByDescending(r => r.CreatedAt).First())
            .Select(r => new { r.BaseCurrency, r.TargetCurrency, r.Rate, r.CreatedAt })
            .ToListAsync();

        return Ok(rates);
    }

    /// <summary>Upserts an exchange rate. Creates a new record (history is preserved).</summary>
    [HttpPost]
    public async Task<IActionResult> Upsert(UpsertRateDto dto)
    {
        if (dto.Rate <= 0) return BadRequest("Rate must be positive.");

        var rate = new ExchangeRate
        {
            BaseCurrency = dto.BaseCurrency.ToUpper().Trim(),
            TargetCurrency = dto.TargetCurrency.ToUpper().Trim(),
            Rate = dto.Rate,
            RecordedByUserId = UserId,
        };

        db.ExchangeRates.Add(rate);
        await db.SaveChangesAsync();
        return Ok(new { rate.BaseCurrency, rate.TargetCurrency, rate.Rate });
    }
}

public record UpsertRateDto(string BaseCurrency, string TargetCurrency, decimal Rate);
