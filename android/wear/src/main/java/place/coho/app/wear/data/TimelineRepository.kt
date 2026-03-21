package place.coho.app.wear.data

import place.coho.app.wear.api.MastodonApi
import place.coho.app.wear.api.MastodonClient
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.sync.AuthState

class TimelineRepository {

    private var api: MastodonApi? = null
    private var currentServer: String? = null
    private var currentToken: String? = null
    private var publicApi: MastodonApi? = null

    private fun getApi(auth: AuthState): MastodonApi {
        if (api == null || currentServer != auth.server || currentToken != auth.accessToken) {
            api = MastodonClient.create(auth.server, auth.accessToken)
            currentServer = auth.server
            currentToken = auth.accessToken
        }
        return api!!
    }

    private fun getPublicApi(): MastodonApi {
        if (publicApi == null) {
            publicApi = MastodonClient.createPublic()
        }
        return publicApi!!
    }

    suspend fun getHomeTimeline(auth: AuthState, maxId: String? = null): List<Status> {
        return getApi(auth).getHomeTimeline(limit = 12, maxId = maxId)
    }

    suspend fun getPublicTimeline(): List<Status> {
        return getPublicApi().getTrendingStatuses(limit = 12)
    }

    suspend fun getStatus(auth: AuthState, id: String): Status {
        return getApi(auth).getStatus(id)
    }

    suspend fun favouriteStatus(auth: AuthState, id: String): Status {
        return getApi(auth).favouriteStatus(id)
    }

    suspend fun unfavouriteStatus(auth: AuthState, id: String): Status {
        return getApi(auth).unfavouriteStatus(id)
    }

    suspend fun reblogStatus(auth: AuthState, id: String): Status {
        return getApi(auth).reblogStatus(id)
    }

    suspend fun unreblogStatus(auth: AuthState, id: String): Status {
        return getApi(auth).unreblogStatus(id)
    }

    suspend fun postStatus(
        auth: AuthState,
        status: String,
        visibility: String = "public",
        inReplyToId: String? = null,
    ): Status {
        return getApi(auth).postStatus(status, visibility, inReplyToId)
    }
}
