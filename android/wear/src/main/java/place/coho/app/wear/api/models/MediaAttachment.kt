package place.coho.app.wear.api.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class MediaAttachment(
    val id: String,
    val type: String, // "image", "gifv", "video", "audio"
    val url: String,
    @Json(name = "preview_url") val previewUrl: String?,
    val description: String?,
)
