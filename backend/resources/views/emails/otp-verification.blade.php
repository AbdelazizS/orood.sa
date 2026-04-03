<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('verification.email_subject', ['app' => config('app.name')]) }}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <tr>
            <td style="padding: 32px 24px;">
                <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #0f172a;">
                    {{ __('verification.email_heading') }}
                </h1>
                <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.5;">
                    {{ __('verification.email_hello', ['name' => $userName]) }}
                </p>
                <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.5;">
                    {{ __('verification.email_body') }}
                </p>
                <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">{{ $code }}</span>
                </div>
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    {{ __('verification.email_expiry') }}
                </p>
                <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
                    {{ __('verification.email_footer') }}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
