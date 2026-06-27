using Microsoft.Extensions.Configuration;
using Minio;
using Minio.DataModel.Args;

namespace Nest.Infrastructure.Services;

public interface IMinioService
{
    Task<string> GetPresignedPutUrlAsync(string bucket, string objectKey, string contentType, int expirySeconds = 3600);
}

public class MinioService : IMinioService
{
    private readonly IMinioClient _minio;

    public MinioService(IConfiguration config)
    {
        var endpoint  = config["MinIO:Endpoint"]  ?? "localhost:9000";
        var accessKey = config["MinIO:AccessKey"] ?? "minioadmin";
        var secretKey = config["MinIO:SecretKey"] ?? "minioadmin";
        var useSsl    = bool.Parse(config["MinIO:UseSSL"] ?? "false");

        _minio = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(accessKey, secretKey)
            .WithSSL(useSsl)
            .Build();
    }

    public async Task<string> GetPresignedPutUrlAsync(
        string bucket, string objectKey, string contentType, int expirySeconds = 3600)
    {
        var args = new PresignedPutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectKey)
            .WithExpiry(expirySeconds);

        return await _minio.PresignedPutObjectAsync(args);
    }
}
