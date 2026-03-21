package place.coho.app.wear.api.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class Notification(
    val id: String,
    val type: String, // follow, mention, reblog, favourite, poll, status, update
    @Json(name = "created_at") val createdAt: String,
    val account: Account,
    val status: Status?,
)
