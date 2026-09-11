# Email notifications

Connect email notifications through the application receiving Formcraft submissions. The library provides form rendering and validation; your backend controls notification settings and delivery. Never put SMTP passwords, API keys, recipients, or email transport configuration into exported form JSON or browser code.

## Notification setup

Store a separate server-side configuration associated with the authoritative form:

```json
{
  "notificationId": "contact-admin",
  "enabled": true,
  "to": ["team@example.com"],
  "subject": "New contact submission",
  "replyToFieldId": "email",
  "includeFieldIds": ["name", "email", "message"]
}
```

This is a suggested host configuration, not a supported Formcraft schema extension. Populate IDs from your saved definition. Keep recipients and sender policy controlled by trusted administrators. Use an allowlist of included fields; exclude passwords and hidden metadata by default. Format structured name/address values explicitly. Escape all inserted values for HTML templates; plain text is simpler for the initial integration.

The recommended flow is: validate → save once → enqueue notification → acknowledge submission. Retry mail jobs separately so mail failures do not create duplicate submissions. Track notification status independently from submission status.

## WordPress with existing SMTP plugins

1. Embed Formcraft in a separate WordPress plugin that provides its admin screen, persistence, and submission endpoint. This plugin is application code; it is not included in the library.
2. Configure your site's existing SMTP plugin using its own settings, or use the site's configured mail transport. No particular provider is required.
3. Set an authenticated sender on a domain you control. Configure the provider's DNS records and send a transport test using that plugin.
4. Configure the notification recipient and allowed field IDs in your integration. Use the visitor's validated email as Reply-To, not as the sender.
5. Submit a test form and inspect the saved entry, mail job status, and receiving inbox. Test failure/retry and duplicate-request handling separately.

The integration should call `wp_mail()`, allowing the site's WordPress mail configuration to handle delivery. Its default content type is plain text. A true return value indicates processing succeeded, not that the recipient received it. [WordPress wp_mail reference](https://developer.wordpress.org/reference/functions/wp_mail/)

### Notification worker example

The following PHP belongs to a separate plugin, **after authoritative validation and persistence**. `$entry` must be the saved record, `$settings` trusted server configuration. This deliberately handles string fields only; extend formatting for structured/array answers.

```php
function formcraft_send_notification(array $entry, array $settings): bool {
    $lines = array('New form submission', '');
    foreach ($settings['includeFieldIds'] as $field_id) {
        $value = $entry['values'][$field_id] ?? null;
        if (is_string($value)) {
            // Labels also come from the authoritative saved schema.
            $label = $entry['labels'][$field_id] ?? $field_id;
            $lines[] = $label . ': ' . $value;
        }
    }

    $headers = array('Content-Type: text/plain; charset=UTF-8');
    $reply_to = $entry['values'][$settings['replyToFieldId']] ?? '';
    if (is_string($reply_to) && !preg_match('/[\r\n]/', $reply_to)
        && is_email($reply_to)) {
        $headers[] = 'Reply-To: ' . $reply_to;
    }

    return wp_mail(
        $settings['to'],
        $settings['subject'],
        implode("\n", $lines),
        $headers
    );
}
```

Validate recipient addresses, subject/header safety, and allowed fields when saving settings. The worker should record its result and retry policy. This function does not implement an endpoint, queue, deduplication, or delivery tracking.

## Other backends

Use your backend's mail service or SMTP client with server environment secrets. Keep its implementation behind an application-owned notification service so changing providers does not change form definitions. Resend is optional, never required. Browser `onSubmit` calls your endpoint; it must not call a credentialed email service directly.

Autoresponders, routing rules, attachments, templates, delivery webhooks, and an email settings UI are future integration features. Configure and test your own transport before enabling notifications.
