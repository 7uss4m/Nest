namespace Nest.Api.Extensions;

internal static class SwaggerLoginPage
{
    public static string Html(bool error) => $$"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Nest API Docs</title>
          <style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{min-height:100vh;display:flex;align-items:center;justify-content:center;
              background:#0B0E14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
            .card{width:100%;max-width:380px;padding:36px;background:#141925;
              border:1px solid rgba(255,255,255,0.07);border-radius:20px}
            .logo{font-size:22px;font-weight:800;color:#EEF1F6;letter-spacing:-.5px;margin-bottom:6px}
            .sub{font-size:13.5px;color:#5B6573;margin-bottom:28px}
            label{display:block;font-size:12px;font-weight:600;color:#98A2B3;
              text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
            input{width:100%;padding:11px 14px;background:#0B0E14;
              border:1px solid rgba(255,255,255,0.08);border-radius:11px;
              color:#EEF1F6;font-size:14px;font-family:monospace;outline:none;
              margin-bottom:16px;transition:border-color .15s}
            input:focus{border-color:rgba(99,102,241,.5)}
            input::placeholder{color:#4B5462;font-family:inherit}
            button{width:100%;padding:12px;background:#6366F1;color:#fff;font-size:14px;
              font-weight:600;border:none;border-radius:11px;cursor:pointer;
              box-shadow:0 6px 18px rgba(99,102,241,.35);transition:background .15s}
            button:hover{background:#5558E3}
            .error{background:rgba(251,113,133,.1);color:#FB7185;font-size:13px;
              padding:10px 14px;border-radius:9px;margin-bottom:16px}
            .hint{font-size:11.5px;color:#4B5462;margin-top:14px;text-align:center}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Nest</div>
            <p class="sub">Enter your API key to access the documentation.</p>
            {{(error ? "<p class=\"error\">Invalid or expired API key.</p>" : "")}}
            <form method="post" action="/login">
              <label for="k">API Key</label>
              <input id="k" type="password" name="key" placeholder="nst_…"
                     autofocus autocomplete="off" spellcheck="false"/>
              <button type="submit">Access docs →</button>
            </form>
            <p class="hint">Generate API keys from the app's Settings page.</p>
          </div>
        </body>
        </html>
        """;
}
