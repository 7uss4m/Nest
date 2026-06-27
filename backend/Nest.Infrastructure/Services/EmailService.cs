using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using Nest.Application.Notifications;

namespace Nest.Infrastructure.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        var host = config["Email:SmtpHost"];
        if (string.IsNullOrWhiteSpace(host)) return;

        var port = config.GetValue<int>("Email:SmtpPort", 587);
        var useSsl = config.GetValue<bool>("Email:UseSsl", false);
        var username = config["Email:Username"] ?? "";
        var password = config["Email:Password"] ?? "";
        var fromAddress = config["Email:FromAddress"] ?? "nest@localhost";
        var fromName = config["Email:FromName"] ?? "Nest";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        try
        {
            using var smtp = new SmtpClient();
            var socketOptions = useSsl
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTlsWhenAvailable;
            await smtp.ConnectAsync(host, port, socketOptions, ct);
            if (!string.IsNullOrWhiteSpace(username))
                await smtp.AuthenticateAsync(username, password, ct);
            await smtp.SendAsync(message, ct);
            await smtp.DisconnectAsync(true, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {Email}", toEmail);
        }
    }
}
