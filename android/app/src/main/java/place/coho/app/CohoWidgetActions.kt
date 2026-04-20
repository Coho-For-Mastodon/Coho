package place.coho.app

import android.content.Context
import android.content.Intent
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.appwidget.GlanceAppWidgetManager

object CohoWidgetKeys {
    val SELECTED_TAB = intPreferencesKey("selected_tab")
    const val TAB_TIMELINE = 0
    const val TAB_NOTIFICATIONS = 1
}

val TabIndexKey = ActionParameters.Key<Int>("tab_index")
val DeepLinkUrlKey = ActionParameters.Key<String>("deep_link_url")

class SwitchTabAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val tabIndex = parameters[TabIndexKey] ?: CohoWidgetKeys.TAB_TIMELINE
        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[CohoWidgetKeys.SELECTED_TAB] = tabIndex
        }
        CohoWidget().update(context, glanceId)
    }
}

class RefreshAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        // Enqueue a background worker to fetch fresh data and update the widget.
        // This ensures the network work happens off the render path.
        WidgetUpdateWorker.enqueueOneTimeRefresh(context)
    }
}

class OpenAppAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(intent)
    }
}

class DeepLinkAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val url = parameters[DeepLinkUrlKey] ?: return
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply {
            setClassName("place.coho.app", "place.coho.app.MainActivity")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(intent)
    }
}
