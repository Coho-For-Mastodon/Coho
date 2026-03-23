package place.coho.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

data class TimelinePost(
    val id: String,
    val authorName: String,
    val authorInitial: String,
    val avatarUrl: String,
    val content: String,
    val createdAt: String
)

data class WidgetNotification(
    val id: String,
    val type: String,
    val typeLabel: String,
    val accountName: String,
    val accountInitial: String,
    val avatarUrl: String,
    val statusContent: String?,
    val createdAt: String
)

object CohoDataFetcher {

    private const val TIMEOUT = 10_000

    /**
     * Fetch home timeline posts. Requires authentication.
     */
    suspend fun fetchHomeTimeline(server: String, token: String, limit: Int = 5): List<TimelinePost> =
        withContext(Dispatchers.IO) {
            if (token.isBlank()) return@withContext emptyList()
            val json = httpGet(
                "https://$server/api/v1/timelines/home?limit=$limit",
                token
            ) ?: return@withContext emptyList()

            val array = JSONArray(json)
            val posts = mutableListOf<TimelinePost>()
            for (i in 0 until minOf(array.length(), limit)) {
                val obj = array.getJSONObject(i)
                val post = parsePost(obj)
                if (post != null) posts.add(post)
            }
            posts
        }

    /**
     * Fetch recent notifications. Requires authentication.
     */
    suspend fun fetchNotifications(server: String, token: String, limit: Int = 5): List<WidgetNotification> =
        withContext(Dispatchers.IO) {
            if (token.isBlank()) return@withContext emptyList()
            val json = httpGet(
                "https://$server/api/v1/notifications?limit=$limit",
                token
            ) ?: return@withContext emptyList()

            val array = JSONArray(json)
            val notifications = mutableListOf<WidgetNotification>()
            for (i in 0 until minOf(array.length(), limit)) {
                val obj = array.getJSONObject(i)
                val notif = parseNotification(obj)
                if (notif != null) notifications.add(notif)
            }
            notifications
        }

    /**
     * Download a bitmap from a URL, scaled to the given size.
     * Returns null on any error.
     */
    suspend fun downloadAvatar(urlString: String, sizePx: Int): Bitmap? =
        withContext(Dispatchers.IO) {
            var conn: HttpURLConnection? = null
            try {
                val url = URL(urlString)
                conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 5_000
                conn.readTimeout = 5_000
                conn.instanceFollowRedirects = true
                if (conn.responseCode != 200) return@withContext null
                val raw = BitmapFactory.decodeStream(conn.inputStream)
                    ?: return@withContext null
                Bitmap.createScaledBitmap(raw, sizePx, sizePx, true)
            } catch (_: Exception) {
                null
            } finally {
                conn?.disconnect()
            }
        }

    private fun parsePost(obj: JSONObject): TimelinePost? {
        // If it's a reblog, use the inner status for content but attribute the boost
        val reblog = obj.optJSONObject("reblog")
        val contentSource = reblog ?: obj
        val account = contentSource.optJSONObject("account") ?: return null

        val displayName = account.optString("display_name", "").ifBlank {
            account.optString("username", "")
        }
        val avatarUrl = account.optString("avatar", "")
        val content = stripHtml(contentSource.optString("content", ""))
        if (content.isBlank()) return null

        return TimelinePost(
            id = obj.optString("id", ""),
            authorName = displayName,
            authorInitial = displayName.firstOrNull()?.uppercase() ?: "?",
            avatarUrl = avatarUrl,
            content = content.take(200),
            createdAt = obj.optString("created_at", "")
        )
    }

    private fun parseNotification(obj: JSONObject): WidgetNotification? {
        val type = obj.optString("type", "")
        val account = obj.optJSONObject("account") ?: return null
        val displayName = account.optString("display_name", "").ifBlank {
            account.optString("username", "")
        }
        val avatarUrl = account.optString("avatar", "")

        val status = obj.optJSONObject("status")
        val statusContent = if (status != null) {
            stripHtml(status.optString("content", "")).take(200)
        } else null

        return WidgetNotification(
            id = obj.optString("id", ""),
            type = type,
            typeLabel = notificationTypeLabel(type),
            accountName = displayName,
            accountInitial = displayName.firstOrNull()?.uppercase() ?: "?",
            avatarUrl = avatarUrl,
            statusContent = statusContent,
            createdAt = obj.optString("created_at", "")
        )
    }

    private fun notificationTypeLabel(type: String): String = when (type) {
        "follow" -> "followed you"
        "follow_request" -> "requested to follow you"
        "mention" -> "mentioned you"
        "reblog" -> "boosted your post"
        "favourite" -> "favourited your post"
        "poll" -> "poll has ended"
        "status" -> "posted"
        "update" -> "edited a post"
        else -> type
    }

    /** Strip HTML tags and decode common entities to get plain text. */
    private fun stripHtml(html: String): String {
        return html
            .replace(Regex("<br\\s*/?>"), " ")
            .replace(Regex("<p>"), "")
            .replace(Regex("</p>"), " ")
            .replace(Regex("<[^>]*>"), "")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&apos;", "'")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun httpGet(urlString: String, bearerToken: String?): String? {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = TIMEOUT
            conn.readTimeout = TIMEOUT
            conn.setRequestProperty("Accept", "application/json")
            if (bearerToken != null) {
                conn.setRequestProperty("Authorization", "Bearer $bearerToken")
            }

            if (conn.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()
                sb.toString()
            } else null
        } catch (_: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }
}
