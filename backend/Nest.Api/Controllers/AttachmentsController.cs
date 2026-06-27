using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Infrastructure.Services;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/attachments")]
[Authorize]
public class AttachmentsController(
    INestDbContext db,
    IMinioService minio,
    IConfiguration config) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    /// <summary>
    /// Returns a short-lived presigned PUT URL the client uses to upload a file directly to MinIO.
    /// After upload, call POST /confirm to record the attachment.
    /// </summary>
    [HttpGet("upload-url")]
    public async Task<IActionResult> GetUploadUrl(
        Guid workspaceId,
        [FromQuery] string fileName,
        [FromQuery] string contentType = "application/octet-stream",
        [FromQuery] string bucket = "receipts")
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();
        if (string.IsNullOrWhiteSpace(fileName)) return BadRequest("fileName is required.");

        var allowedBuckets = new[]
        {
            config["MinIO:BucketReceipts"] ?? "receipts",
            config["MinIO:BucketAssets"]   ?? "asset-attachments",
        };
        if (!allowedBuckets.Contains(bucket)) return BadRequest("Invalid bucket.");

        var ext = Path.GetExtension(fileName);
        var objectKey = $"{workspaceId}/{Guid.NewGuid()}{ext}";

        try
        {
            var url = await minio.GetPresignedPutUrlAsync(bucket, objectKey, contentType);
            return Ok(new { url, objectKey, bucket });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = "MinIO unavailable.", detail = ex.Message });
        }
    }

    /// <summary>Confirms an upload and records the attachment in the database.</summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm(Guid workspaceId, ConfirmAttachmentDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var attachment = new Attachment
        {
            TransactionId = dto.TransactionId,
            FileUrl = $"{dto.Bucket}/{dto.ObjectKey}",
            FileType = dto.ContentType,
            Label = dto.FileName,
        };

        db.Attachments.Add(attachment);
        await db.SaveChangesAsync();
        return Ok(new { attachment.Id, attachment.FileUrl });
    }
}

public record ConfirmAttachmentDto(
    Guid TransactionId,
    string ObjectKey,
    string Bucket,
    string FileName,
    string ContentType);
