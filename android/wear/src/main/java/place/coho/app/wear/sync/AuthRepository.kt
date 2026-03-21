package place.coho.app.wear.sync

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.authDataStore by preferencesDataStore(name = "coho_auth")

data class AuthState(
    val server: String,
    val accessToken: String,
    val acct: String,
) {
    val isAuthenticated: Boolean get() = server.isNotBlank() && accessToken.isNotBlank()
}

/**
 * Single source of truth for watch-side credentials.
 * Written by [AuthSyncService] when the phone pushes a DataItem,
 * read by the UI layer to build API clients.
 */
class AuthRepository(private val context: Context) {

    private val keyServer = stringPreferencesKey("server")
    private val keyAccessToken = stringPreferencesKey("access_token")
    private val keyAcct = stringPreferencesKey("acct")

    val authState: Flow<AuthState> = context.authDataStore.data.map { prefs ->
        AuthState(
            server = prefs[keyServer] ?: "",
            accessToken = prefs[keyAccessToken] ?: "",
            acct = prefs[keyAcct] ?: "",
        )
    }

    suspend fun saveCredentials(server: String, accessToken: String, acct: String) {
        context.authDataStore.edit { prefs ->
            prefs[keyServer] = server
            prefs[keyAccessToken] = accessToken
            prefs[keyAcct] = acct
        }
    }

    suspend fun clear() {
        context.authDataStore.edit { it.clear() }
    }
}
