package place.coho.app.wear.ui.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.Card
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import coil.compose.AsyncImage
import place.coho.app.wear.R
import place.coho.app.wear.api.models.Notification
import place.coho.app.wear.ui.components.htmlToPlainText
import place.coho.app.wear.ui.components.relativeTime
import place.coho.app.wear.sync.AuthState
import androidx.compose.ui.res.stringResource

@Composable
fun NotificationsScreen(
    auth: AuthState,
    viewModel: NotificationsViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(auth) {
        viewModel.loadNotifications(auth)
    }

    when (val state = uiState) {
        is NotificationsUiState.Loading -> {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize(),
            ) {
                CircularProgressIndicator()
            }
        }

        is NotificationsUiState.Error -> {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize().padding(16.dp),
            ) {
                Text(
                    text = stringResource(R.string.error_no_connection),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        is NotificationsUiState.Success -> {
            val listState = rememberScalingLazyListState()

            ScreenScaffold(
                scrollState = listState,
            ) {
                ScalingLazyColumn(
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    item {
                        ListHeader {
                            Text(stringResource(R.string.notifications_title))
                        }
                    }

                    items(state.notifications, key = { it.id }) { notification ->
                        NotificationCard(notification)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(notification: Notification) {
    Card(
        onClick = { },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(4.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = notificationIcon(notification.type),
                    style = MaterialTheme.typography.titleSmall,
                )
                Spacer(modifier = Modifier.width(6.dp))
                AsyncImage(
                    model = notification.account.avatar,
                    contentDescription = null,
                    modifier = Modifier
                        .size(18.dp)
                        .clip(CircleShape),
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = notification.account.displayName.ifBlank {
                        notification.account.username
                    },
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = relativeTime(notification.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = notificationLabel(notification.type),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            // Show post preview if available
            notification.status?.let { status ->
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = htmlToPlainText(status.content),
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
            }
        }
    }
}

private fun notificationIcon(type: String): String = when (type) {
    "follow" -> "👤"
    "follow_request" -> "👤"
    "mention" -> "💬"
    "reblog" -> "🔁"
    "favourite" -> "❤️"
    "poll" -> "📊"
    "status" -> "📝"
    "update" -> "✏️"
    else -> "🔔"
}

private fun notificationLabel(type: String): String = when (type) {
    "follow" -> "followed you"
    "follow_request" -> "requested to follow you"
    "mention" -> "mentioned you"
    "reblog" -> "boosted your post"
    "favourite" -> "favorited your post"
    "poll" -> "poll ended"
    "status" -> "posted"
    "update" -> "edited a post"
    else -> ""
}
