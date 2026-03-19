package place.coho.app.wear.data

import place.coho.app.wear.api.MastodonApi
import place.coho.app.wear.api.MastodonClient
import place.coho.app.wear.api.models.Notification
import place.coho.app.wear.sync.AuthState

class NotificationRepository {

    private var api: MastodonApi? = null
    private var currentServer: String? = null
    private var currentToken: String? = null

    private fun getApi(auth: AuthState): MastodonApi {
        if (api == null || currentServer != auth.server || currentToken != auth.accessToken) {
            api = MastodonClient.create(auth.server, auth.accessToken)
            currentServer = auth.server
            currentToken = auth.accessToken
        }
        return api!!
    }

    suspend fun getNotifications(auth: AuthState): List<Notification> {
        return getApi(auth).getNotifications(limit = 20)
    }
}
