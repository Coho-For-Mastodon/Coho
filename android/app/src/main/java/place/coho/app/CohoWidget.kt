package place.coho.app

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle

class CohoWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences(WidgetBridge.PREFS_NAME, Context.MODE_PRIVATE)
        val server = prefs.getString(WidgetBridge.PREF_SERVER, WidgetBridge.DEFAULT_SERVER) ?: WidgetBridge.DEFAULT_SERVER
        val token = prefs.getString(WidgetBridge.PREF_ACCESS_TOKEN, "") ?: ""

        // Fetch all data upfront
        val timelinePosts = CohoDataFetcher.fetchHomeTimeline(server, token)
        val notifications = CohoDataFetcher.fetchNotifications(server, token)
        val isAuthenticated = token.isNotBlank()

        // Download avatars (32dp ≈ 64px at 2x density)
        val avatarSize = (32 * context.resources.displayMetrics.density).toInt()
        val avatarCache = mutableMapOf<String, Bitmap>()
        val allUrls = timelinePosts.map { it.avatarUrl } + notifications.map { it.avatarUrl }
        for (url in allUrls.distinct()) {
            if (url.isNotBlank()) {
                CohoDataFetcher.downloadAvatar(context, url, avatarSize)?.let { avatarCache[url] = it }
            }
        }

        // Download media thumbnails for timeline posts with image attachments
        val thumbSize = (80 * context.resources.displayMetrics.density).toInt()
        val mediaCache = mutableMapOf<String, Bitmap>()
        for (post in timelinePosts) {
            val url = post.mediaPreviewUrl
            if (!url.isNullOrBlank()) {
                CohoDataFetcher.downloadAvatar(context, url, thumbSize)?.let { mediaCache[url] = it }
            }
        }

        provideContent {
            GlanceTheme {
                WidgetContent(
                    isAuthenticated = isAuthenticated,
                    timelinePosts = timelinePosts,
                    notifications = notifications,
                    avatarCache = avatarCache,
                    mediaCache = mediaCache
                )
            }
        }
    }

    @Composable
    private fun WidgetContent(
        isAuthenticated: Boolean,
        timelinePosts: List<TimelinePost>,
        notifications: List<WidgetNotification>,
        avatarCache: Map<String, Bitmap>,
        mediaCache: Map<String, Bitmap>
    ) {
        val prefs = currentState<Preferences>()
        val selectedTab = prefs[CohoWidgetKeys.SELECTED_TAB] ?: CohoWidgetKeys.TAB_TIMELINE

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(GlanceTheme.colors.widgetBackground)
                .cornerRadius(24.dp)
                .padding(12.dp)
        ) {
            // Header
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Coho",
                    style = TextStyle(
                        color = GlanceTheme.colors.primary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    modifier = GlanceModifier.defaultWeight().padding(start = 4.dp)
                )
                Box(
                    modifier = GlanceModifier
                        .size(32.dp)
                        .background(GlanceTheme.colors.primary)
                        .cornerRadius(16.dp)
                        .clickable(actionRunCallback<DeepLinkAction>(
                            actionParametersOf(DeepLinkUrlKey to "https://localhost/home?newPost=1")
                        )),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "+",
                        style = TextStyle(
                            color = GlanceTheme.colors.onPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    )
                }
            }

            // Tab bar
            TabBar(selectedTab = selectedTab)

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Content
            when (selectedTab) {
                CohoWidgetKeys.TAB_TIMELINE -> {
                    if (!isAuthenticated) {
                        SignInPrompt()
                    } else if (timelinePosts.isEmpty()) {
                        EmptyState("No posts yet")
                    } else {
                        TimelineList(timelinePosts, avatarCache, mediaCache)
                    }
                }
                CohoWidgetKeys.TAB_NOTIFICATIONS -> {
                    if (!isAuthenticated) {
                        SignInPrompt()
                    } else if (notifications.isEmpty()) {
                        EmptyState("No notifications")
                    } else {
                        NotificationList(notifications, avatarCache)
                    }
                }
            }
        }
    }

    @Composable
    private fun TabBar(selectedTab: Int) {
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .cornerRadius(12.dp)
                .padding(2.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            TabButton("Home", CohoWidgetKeys.TAB_TIMELINE, selectedTab,
                GlanceModifier.defaultWeight())
            Spacer(modifier = GlanceModifier.width(4.dp))
            TabButton("Notifications", CohoWidgetKeys.TAB_NOTIFICATIONS, selectedTab,
                GlanceModifier.defaultWeight())
        }
    }

    @Composable
    private fun TabButton(label: String, tabIndex: Int, selectedTab: Int, weightModifier: GlanceModifier) {
        val isSelected = tabIndex == selectedTab

        val action = actionRunCallback<SwitchTabAction>(
            actionParametersOf(TabIndexKey to tabIndex)
        )

        val modifier = if (isSelected) {
            weightModifier
                .background(GlanceTheme.colors.primary)
                .cornerRadius(10.dp)
                .padding(horizontal = 6.dp, vertical = 8.dp)
                .clickable(action)
        } else {
            weightModifier
                .background(GlanceTheme.colors.secondaryContainer)
                .cornerRadius(10.dp)
                .padding(horizontal = 6.dp, vertical = 8.dp)
                .clickable(action)
        }

        Text(
            text = label,
            style = TextStyle(
                color = if (isSelected) GlanceTheme.colors.onPrimary else GlanceTheme.colors.onSecondaryContainer,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                textAlign = TextAlign.Center
            ),
            modifier = modifier
        )
    }

    @Composable
    private fun SignInPrompt() {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .clickable(actionStartActivity<MainActivity>()),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Sign in to Coho",
                    style = TextStyle(
                        color = GlanceTheme.colors.primary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = "Tap to open the app",
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 12.sp
                    )
                )
            }
        }
    }

    @Composable
    private fun EmptyState(message: String) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .clickable(actionRunCallback<RefreshAction>()),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = message,
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = "Tap to refresh",
                    style = TextStyle(
                        color = GlanceTheme.colors.primary,
                        fontSize = 12.sp
                    )
                )
            }
        }
    }

    @Composable
    private fun TimelineList(posts: List<TimelinePost>, avatarCache: Map<String, Bitmap>, mediaCache: Map<String, Bitmap>) {
        LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
            items(posts, itemId = { it.id.hashCode().toLong() }) { post ->
                TimelineItem(post, avatarCache[post.avatarUrl], post.mediaPreviewUrl?.let { mediaCache[it] })
            }
        }
    }

    @Composable
    private fun TimelineItem(post: TimelinePost, avatar: Bitmap?, thumbnail: Bitmap?) {
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(vertical = 4.dp, horizontal = 4.dp)
                .clickable(actionRunCallback<DeepLinkAction>(
                    actionParametersOf(DeepLinkUrlKey to "https://localhost/home")
                )),
            verticalAlignment = Alignment.Top
        ) {
            // Avatar
            if (avatar != null) {
                Image(
                    provider = ImageProvider(avatar),
                    contentDescription = post.authorName,
                    modifier = GlanceModifier
                        .size(32.dp)
                        .cornerRadius(16.dp),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = GlanceModifier
                        .size(32.dp)
                        .cornerRadius(16.dp)
                        .background(GlanceTheme.colors.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = post.authorInitial,
                        style = TextStyle(
                            color = GlanceTheme.colors.onPrimaryContainer,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.width(8.dp))

            Column(modifier = GlanceModifier.defaultWeight()) {
                Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = post.authorName,
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurface,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1,
                        modifier = GlanceModifier.defaultWeight()
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = CohoDataFetcher.relativeTime(post.createdAt),
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    )
                }
                Text(
                    text = post.content,
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 12.sp
                    ),
                    maxLines = 2
                )
                if (thumbnail != null) {
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Image(
                        provider = ImageProvider(thumbnail),
                        contentDescription = null,
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .height(80.dp)
                            .cornerRadius(8.dp),
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }
    }

    @Composable
    private fun NotificationList(notifications: List<WidgetNotification>, avatarCache: Map<String, Bitmap>) {
        LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
            items(notifications, itemId = { it.id.hashCode().toLong() }) { notif ->
                NotificationItem(notif, avatarCache[notif.avatarUrl])
            }
        }
    }

    @Composable
    private fun NotificationItem(notif: WidgetNotification, avatar: Bitmap?) {
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(vertical = 4.dp, horizontal = 4.dp)
                .clickable(actionRunCallback<DeepLinkAction>(
                    actionParametersOf(DeepLinkUrlKey to "https://localhost/home?tab=notifications")
                )),
            verticalAlignment = Alignment.Top
        ) {
            // Avatar
            if (avatar != null) {
                Image(
                    provider = ImageProvider(avatar),
                    contentDescription = notif.accountName,
                    modifier = GlanceModifier
                        .size(32.dp)
                        .cornerRadius(16.dp),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = GlanceModifier
                        .size(32.dp)
                        .cornerRadius(16.dp)
                        .background(GlanceTheme.colors.tertiaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = notif.accountInitial,
                        style = TextStyle(
                            color = GlanceTheme.colors.onTertiaryContainer,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.width(8.dp))

            Column(modifier = GlanceModifier.defaultWeight()) {
                Row {
                    Text(
                        text = notif.accountName,
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurface,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = notif.typeLabel,
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 12.sp
                        ),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = CohoDataFetcher.relativeTime(notif.createdAt),
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    )
                }
                if (!notif.statusContent.isNullOrBlank()) {
                    Text(
                        text = notif.statusContent,
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 12.sp
                        ),
                        maxLines = 2
                    )
                }
            }
        }
    }

}
