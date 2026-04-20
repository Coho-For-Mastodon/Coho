package place.coho.app

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import java.io.IOException

/**
 * WorkManager worker that fetches fresh data and pre-warms the image cache,
 * then signals the widget to re-render. All network I/O lives here so that
 * [CohoWidget.provideGlance] can be a fast, network-free read-and-render.
 */
class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "WidgetUpdateWorker"
        private const val ONE_TIME_WORK_NAME = "coho_widget_refresh_once"

        fun enqueueOneTimeRefresh(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_TIME_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<WidgetUpdateWorker>().build()
            )
        }
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(WidgetBridge.PREFS_NAME, Context.MODE_PRIVATE)
        val server = prefs.getString(WidgetBridge.PREF_SERVER, WidgetBridge.DEFAULT_SERVER) ?: WidgetBridge.DEFAULT_SERVER
        val token = prefs.getString(WidgetBridge.PREF_ACCESS_TOKEN, "") ?: ""

        if (token.isBlank()) {
            // No credentials — re-render to show sign-in prompt and stop.
            CohoWidget().updateAll(applicationContext)
            return Result.success()
        }

        return try {
            coroutineScope {
                // Fetch timeline and notifications concurrently.
                val timelineDeferred = async { CohoDataFetcher.fetchHomeTimeline(server, token) }
                val notificationsDeferred = async { CohoDataFetcher.fetchNotifications(server, token) }
                val timelinePosts = timelineDeferred.await()
                val notifications = notificationsDeferred.await()

                // Persist API responses to disk so provideGlance can render without network.
                CohoDataFetcher.saveTimelineCache(applicationContext, timelinePosts)
                CohoDataFetcher.saveNotificationsCache(applicationContext, notifications)

                // Pre-warm the image disk cache in parallel (max 4 concurrent downloads).
                val density = applicationContext.resources.displayMetrics.density
                val avatarSize = (32 * density).toInt()
                val thumbSize = (80 * density).toInt()
                val avatarUrls = (timelinePosts.map { it.avatarUrl } + notifications.map { it.avatarUrl })
                    .distinct().filter { it.isNotBlank() }
                val thumbUrls = timelinePosts.mapNotNull { it.mediaPreviewUrl }.filter { it.isNotBlank() }

                val semaphore = Semaphore(4)
                val imageJobs = avatarUrls.map { url ->
                    async { semaphore.withPermit { CohoDataFetcher.downloadBitmap(applicationContext, url, avatarSize) } }
                } + thumbUrls.map { url ->
                    async { semaphore.withPermit { CohoDataFetcher.downloadBitmap(applicationContext, url, thumbSize) } }
                }
                imageJobs.awaitAll()
            }

            CohoWidget().updateAll(applicationContext)
            Result.success()
        } catch (e: UnauthorizedException) {
            Log.w(TAG, "Widget auth token invalid — clearing stored token")
            prefs.edit().putString(WidgetBridge.PREF_ACCESS_TOKEN, "").apply()
            CohoWidget().updateAll(applicationContext)
            Result.failure()
        } catch (e: IOException) {
            Log.e(TAG, "Widget update failed (transient)", e)
            Result.retry()
        } catch (e: Exception) {
            Log.e(TAG, "Widget update failed (non-transient)", e)
            Result.failure()
        }
    }
}
