package place.coho.app.wear.api.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class Status(
    val id: String,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "in_reply_to_id") val inReplyToId: String?,
    val sensitive: Boolean = false,
    @Json(name = "spoiler_text") val spoilerText: String = "",
    val visibility: String = "public",
    val content: String, // HTML content
    val reblog: Status?,
    val account: Account,
    @Json(name = "media_attachments") val mediaAttachments: List<MediaAttachment> = emptyList(),
    @Json(name = "replies_count") val repliesCount: Int = 0,
    @Json(name = "reblogs_count") val reblogsCount: Int = 0,
    @Json(name = "favourites_count") val favouritesCount: Int = 0,
    val favourited: Boolean = false,
    val reblogged: Boolean = false,
)
