package place.coho.app.wear.ui.components

import android.text.Html
import java.time.Duration
import java.time.Instant
import java.time.format.DateTimeParseException

/**
 * Strips HTML tags from Mastodon post content and returns plain text.
 * Also converts `<br>` and `</p>` to newlines for readability.
 */
fun htmlToPlainText(html: String): String {
    // Use Android's Html parser which handles entities and tags
    return Html.fromHtml(html, Html.FROM_HTML_MODE_COMPACT)
        .toString()
        .trim()
}

/**
 * Returns a human-readable relative time string, e.g. "5m ago", "2h ago".
 */
fun relativeTime(isoTimestamp: String): String {
    return try {
        val then = Instant.parse(isoTimestamp)
        val now = Instant.now()
        val duration = Duration.between(then, now)

        when {
            duration.toMinutes() < 1 -> "now"
            duration.toHours() < 1 -> "${duration.toMinutes()}m"
            duration.toDays() < 1 -> "${duration.toHours()}h"
            duration.toDays() < 7 -> "${duration.toDays()}d"
            else -> "${duration.toDays() / 7}w"
        }
    } catch (_: DateTimeParseException) {
        ""
    }
}
