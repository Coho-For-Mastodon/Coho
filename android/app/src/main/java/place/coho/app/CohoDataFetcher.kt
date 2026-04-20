package place.coho.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class UnauthorizedException : Exception()

data class TimelinePost(
    val id: String,
    val authorName: String,
    val authorInitial: String,
    val avatarUrl: String,
    val content: String,
    val createdAt: String,
    val mediaPreviewUrl: String?
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
    private const val TIMELINE_CACHE_FILE = "widget_timeline_cache.json"
    private const val NOTIFICATIONS_CACHE_FILE = "widget_notifications_cache.json"

    /**
     * Fetch home timeline posts. Requires authentication.
     * Throws [UnauthorizedException] if the server returns HTTP 401.
     */
    suspend fun fetchHomeTimeline(server: String, token: String, limit: Int = 20): List<TimelinePost> =
        withContext(Dispatchers.IO) {
            if (token.isBlank()) return@withContext emptyList()
            val (code, json) = httpGet(
                "https://$server/api/v1/timelines/home?limit=$limit",
                token
            )
            if (code == 401) throw UnauthorizedException()
            val body = json ?: return@withContext emptyList()
            try {
                val array = JSONArray(body)
                val posts = mutableListOf<TimelinePost>()
                for (i in 0 until minOf(array.length(), limit)) {
                    val obj = array.getJSONObject(i)
                    val post = parsePost(obj)
                    if (post != null) posts.add(post)
                }
                posts
            } catch (_: Exception) {
                emptyList()
            }
        }

    /**
     * Fetch recent notifications. Requires authentication.
     * Throws [UnauthorizedException] if the server returns HTTP 401.
     */
    suspend fun fetchNotifications(server: String, token: String, limit: Int = 15): List<WidgetNotification> =
        withContext(Dispatchers.IO) {
            if (token.isBlank()) return@withContext emptyList()
            val (code, json) = httpGet(
                "https://$server/api/v1/notifications?limit=$limit",
                token
            )
            if (code == 401) throw UnauthorizedException()
            val body = json ?: return@withContext emptyList()
            try {
                val array = JSONArray(body)
                val notifications = mutableListOf<WidgetNotification>()
                for (i in 0 until minOf(array.length(), limit)) {
                    val obj = array.getJSONObject(i)
                    val notif = parseNotification(obj)
                    if (notif != null) notifications.add(notif)
                }
                notifications
            } catch (_: Exception) {
                emptyList()
            }
        }

    /**
     * Download a bitmap from a URL, scaled to the given size.
     * Caches decoded bitmaps to disk for 24 hours to avoid re-downloading on every widget refresh.
     * Returns null on any error.
     */
    suspend fun downloadBitmap(context: Context, urlString: String, sizePx: Int): Bitmap? =
        withContext(Dispatchers.IO) {
            if (urlString.isBlank()) return@withContext null

            val cacheDir = File(context.cacheDir, "widget_images").also { it.mkdirs() }
            val cacheFile = File(cacheDir, "${md5Hex(urlString)}_$sizePx.png")

            // Serve from disk cache if < 24 hours old
            if (cacheFile.exists() && System.currentTimeMillis() - cacheFile.lastModified() < 86_400_000L) {
                BitmapFactory.decodeFile(cacheFile.absolutePath)?.let { return@withContext it }
            }

            // Expired cache file — delete before downloading a fresh copy
            if (cacheFile.exists()) cacheFile.delete()

            // Download fresh copy
            var conn: HttpURLConnection? = null
            try {
                val url = URL(urlString)
                conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 5_000
                conn.readTimeout = 5_000
                conn.instanceFollowRedirects = true
                if (conn.responseCode != 200) return@withContext null
                val raw = conn.inputStream.use { input -> BitmapFactory.decodeStream(input) }
                    ?: return@withContext null
                val scaled = Bitmap.createScaledBitmap(raw, sizePx, sizePx, true)
                if (scaled != raw) raw.recycle()

                // Persist to disk cache (best-effort)
                try {
                    cacheFile.outputStream().use { out ->
                        scaled.compress(Bitmap.CompressFormat.PNG, 100, out)
                    }
                } catch (_: Exception) { }

                scaled
            } catch (_: Exception) {
                null
            } finally {
                conn?.disconnect()
            }
        }

    /**
     * Load a bitmap from the disk image cache only — no network call.
     * Returns null if the image has not been cached yet.
     */
    fun loadBitmapFromDiskCache(context: Context, urlString: String, sizePx: Int): Bitmap? {
        if (urlString.isBlank()) return null
        val cacheFile = File(File(context.cacheDir, "widget_images"), "${md5Hex(urlString)}_$sizePx.png")
        if (!cacheFile.exists()) return null
        return try {
            BitmapFactory.decodeFile(cacheFile.absolutePath)
        } catch (_: Exception) {
            null
        }
    }

    /** Serialize and write the timeline post list to disk cache. */
    fun saveTimelineCache(context: Context, posts: List<TimelinePost>) {
        val array = JSONArray()
        posts.forEach { array.put(serializePost(it)) }
        try { File(context.cacheDir, TIMELINE_CACHE_FILE).writeText(array.toString()) } catch (_: Exception) { }
    }

    /** Load timeline posts from disk cache. Returns empty list if absent or unreadable. */
    fun loadTimelineCache(context: Context): List<TimelinePost> = try {
        val array = JSONArray(File(context.cacheDir, TIMELINE_CACHE_FILE).readText())
        (0 until array.length()).mapNotNull { deserializePost(array.getJSONObject(it)) }
    } catch (_: Exception) {
        emptyList()
    }

    /** Serialize and write the notifications list to disk cache. */
    fun saveNotificationsCache(context: Context, notifications: List<WidgetNotification>) {
        val array = JSONArray()
        notifications.forEach { array.put(serializeNotification(it)) }
        try { File(context.cacheDir, NOTIFICATIONS_CACHE_FILE).writeText(array.toString()) } catch (_: Exception) { }
    }

    /** Load notifications from disk cache. Returns empty list if absent or unreadable. */
    fun loadNotificationsCache(context: Context): List<WidgetNotification> = try {
        val array = JSONArray(File(context.cacheDir, NOTIFICATIONS_CACHE_FILE).readText())
        (0 until array.length()).mapNotNull { deserializeNotification(array.getJSONObject(it)) }
    } catch (_: Exception) {
        emptyList()
    }

    private fun serializePost(post: TimelinePost): JSONObject = JSONObject().apply {
        put("id", post.id)
        put("authorName", post.authorName)
        put("authorInitial", post.authorInitial)
        put("avatarUrl", post.avatarUrl)
        put("content", post.content)
        put("createdAt", post.createdAt)
        if (post.mediaPreviewUrl != null) put("mediaPreviewUrl", post.mediaPreviewUrl)
    }

    private fun deserializePost(obj: JSONObject): TimelinePost? = try {
        TimelinePost(
            id = obj.optString("id", ""),
            authorName = obj.optString("authorName", ""),
            authorInitial = obj.optString("authorInitial", "?"),
            avatarUrl = obj.optString("avatarUrl", ""),
            content = obj.optString("content", ""),
            createdAt = obj.optString("createdAt", ""),
            mediaPreviewUrl = obj.optString("mediaPreviewUrl", "").ifBlank { null }
        )
    } catch (_: Exception) { null }

    private fun serializeNotification(notif: WidgetNotification): JSONObject = JSONObject().apply {
        put("id", notif.id)
        put("type", notif.type)
        put("typeLabel", notif.typeLabel)
        put("accountName", notif.accountName)
        put("accountInitial", notif.accountInitial)
        put("avatarUrl", notif.avatarUrl)
        if (notif.statusContent != null) put("statusContent", notif.statusContent)
        put("createdAt", notif.createdAt)
    }

    private fun deserializeNotification(obj: JSONObject): WidgetNotification? = try {
        WidgetNotification(
            id = obj.optString("id", ""),
            type = obj.optString("type", ""),
            typeLabel = obj.optString("typeLabel", ""),
            accountName = obj.optString("accountName", ""),
            accountInitial = obj.optString("accountInitial", "?"),
            avatarUrl = obj.optString("avatarUrl", ""),
            statusContent = obj.optString("statusContent", "").ifBlank { null },
            createdAt = obj.optString("createdAt", "")
        )
    } catch (_: Exception) { null }

    private fun parsePost(obj: JSONObject): TimelinePost? {
        // If it's a reblog, use the inner status for content but attribute the boost
        val reblog = obj.optJSONObject("reblog")
        val contentSource = reblog ?: obj

        // Skip posts with content warnings — not appropriate for widget surface
        val spoilerText = contentSource.optString("spoiler_text", "")
        val sensitive = contentSource.optBoolean("sensitive", false)
        if (spoilerText.isNotBlank() || sensitive) return null

        val account = contentSource.optJSONObject("account") ?: return null

        val displayName = account.optString("display_name", "").ifBlank {
            account.optString("username", "")
        }
        val avatarUrl = account.optString("avatar", "")
        val content = stripHtml(contentSource.optString("content", ""))
        if (content.isBlank()) return null

        val mediaAttachments = contentSource.optJSONArray("media_attachments")
        val mediaPreviewUrl = if (mediaAttachments != null && mediaAttachments.length() > 0) {
            val first = mediaAttachments.getJSONObject(0)
            if (first.optString("type") == "image") first.optString("preview_url", "").ifBlank { null }
            else null
        } else null

        return TimelinePost(
            id = obj.optString("id", ""),
            authorName = displayName,
            authorInitial = displayName.firstOrNull()?.uppercase() ?: "?",
            avatarUrl = avatarUrl,
            content = content.take(200),
            createdAt = obj.optString("created_at", ""),
            mediaPreviewUrl = mediaPreviewUrl
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

    /** Stable filename key for a URL (not cryptographically collision-resistant; used for cache file naming only). */
    private fun md5Hex(input: String): String {
        val digest = MessageDigest.getInstance("MD5").digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    /**
     * Format an ISO 8601 timestamp as a human-readable relative string.
     * E.g. "now", "5m", "3h", "2d", "Apr 10".
     */
    fun relativeTime(isoString: String): String {
        if (isoString.isBlank()) return ""
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            val date = sdf.parse(isoString.take(19)) ?: return ""
            val diff = System.currentTimeMillis() - date.time
            if (diff <= 0L) return "now"
            when {
                diff < 60_000L -> "now"
                diff < 3_600_000L -> "${diff / 60_000}m"
                diff < 86_400_000L -> "${diff / 3_600_000}h"
                diff < 7 * 86_400_000L -> "${diff / 86_400_000}d"
                else -> {
                    val months = arrayOf("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
                    val cal = Calendar.getInstance().apply { time = date }
                    "${months[cal.get(Calendar.MONTH)]} ${cal.get(Calendar.DAY_OF_MONTH)}"
                }
            }
        } catch (_: Exception) {
            ""
        }
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

    // Returns (httpStatusCode, responseBody). statusCode is -1 on connection failure.
    private fun httpGet(urlString: String, bearerToken: String?): Pair<Int, String?> {
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
            val code = conn.responseCode
            if (code == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()
                Pair(code, sb.toString())
            } else {
                Pair(code, null)
            }
        } catch (_: Exception) {
            Pair(-1, null)
        } finally {
            conn?.disconnect()
        }
    }
}
