package place.coho.app.wear.api.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class Account(
    val id: String,
    val username: String,
    val acct: String,
    @Json(name = "display_name") val displayName: String,
    val avatar: String,
    val bot: Boolean = false,
)
