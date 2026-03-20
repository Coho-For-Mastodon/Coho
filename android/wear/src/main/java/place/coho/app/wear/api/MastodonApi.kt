package place.coho.app.wear.api

import place.coho.app.wear.api.models.Notification
import place.coho.app.wear.api.models.Status
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MastodonApi {

    @GET("api/v1/timelines/home")
    suspend fun getHomeTimeline(
        @Query("limit") limit: Int = 12,
        @Query("max_id") maxId: String? = null,
    ): List<Status>

    @POST("api/v1/statuses/{id}/favourite")
    suspend fun favouriteStatus(@Path("id") id: String): Status

    @POST("api/v1/statuses/{id}/unfavourite")
    suspend fun unfavouriteStatus(@Path("id") id: String): Status

    @POST("api/v1/statuses/{id}/reblog")
    suspend fun reblogStatus(@Path("id") id: String): Status

    @POST("api/v1/statuses/{id}/unreblog")
    suspend fun unreblogStatus(@Path("id") id: String): Status

    @GET("api/v1/trends/statuses")
    suspend fun getTrendingStatuses(
        @Query("limit") limit: Int = 12,
    ): List<Status>

    @GET("api/v1/notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 20,
        @Query("max_id") maxId: String? = null,
    ): List<Notification>

    @FormUrlEncoded
    @POST("api/v1/statuses")
    suspend fun postStatus(
        @Field("status") status: String,
        @Field("visibility") visibility: String = "public",
        @Field("in_reply_to_id") inReplyToId: String? = null,
    ): Status
}
