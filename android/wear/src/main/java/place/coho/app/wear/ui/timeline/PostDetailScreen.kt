package place.coho.app.wear.ui.timeline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.Card
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import coil.compose.AsyncImage
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.ui.components.htmlToPlainText
import place.coho.app.wear.ui.components.relativeTime

@Composable
fun PostDetailScreen(
    status: Status,
    onFavourite: ((String) -> Unit)?,
    onBoost: ((String) -> Unit)?,
) {
    val displayStatus = status.reblog ?: status
    val isBoosted = status.reblog != null
    val listState = rememberScalingLazyListState()

    ScreenScaffold(
        scrollState = listState,
    ) {
        ScalingLazyColumn(
            state = listState,
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
        // Boost indicator
        if (isBoosted) {
            item {
                Text(
                    text = "\uD83D\uDD01 ${status.account.displayName} boosted",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }
        }

        // Author info
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
            ) {
                AsyncImage(
                    model = displayStatus.account.avatar,
                    contentDescription = null,
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = displayStatus.account.displayName.ifBlank {
                            displayStatus.account.username
                        },
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "@${displayStatus.account.acct}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        // Content warning
        if (displayStatus.spoilerText.isNotBlank()) {
            item {
                Text(
                    text = "⚠\uFE0F ${displayStatus.spoilerText}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }
        }

        // Full post content (no truncation)
        item {
            Text(
                text = htmlToPlainText(displayStatus.content),
                style = MaterialTheme.typography.bodySmall,
                lineHeight = 18.sp,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        // Media attachments
        if (displayStatus.mediaAttachments.isNotEmpty()) {
            items(displayStatus.mediaAttachments.size) { index ->
                val attachment = displayStatus.mediaAttachments[index]
                val imageUrl = attachment.previewUrl ?: attachment.url

                if (attachment.type == "image" || attachment.type == "gifv") {
                    Card(
                        onClick = { },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp),
                    ) {
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = attachment.description,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(16f / 9f)
                                .clip(RoundedCornerShape(8.dp)),
                        )
                    }
                } else {
                    Text(
                        text = "\uD83C\uDFA5 ${attachment.type} attachment",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )
                }
            }
        }

        // Timestamp
        item {
            Text(
                text = relativeTime(displayStatus.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        // Stats & actions
        item {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
            ) {
                if (onFavourite != null) {
                    ActionChip(
                        label = if (displayStatus.favourited) "❤\uFE0F" else "\uD83E\uDD0D",
                        count = displayStatus.favouritesCount,
                        onClick = { onFavourite(displayStatus.id) },
                    )
                } else {
                    Text(
                        text = "❤\uFE0F ${displayStatus.favouritesCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                if (onBoost != null) {
                    ActionChip(
                        label = if (displayStatus.reblogged) "\uD83D\uDD01" else "\uD83D\uDD04",
                        count = displayStatus.reblogsCount,
                        onClick = { onBoost(displayStatus.id) },
                    )
                } else {
                    Text(
                        text = "\uD83D\uDD01 ${displayStatus.reblogsCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Text(
                    text = "\uD83D\uDCAC ${displayStatus.repliesCount}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
        }
        }
    }
}

@Composable
private fun ActionChip(
    label: String,
    count: Int,
    onClick: () -> Unit,
) {
    androidx.wear.compose.material3.TextButton(
        onClick = onClick,
    ) {
        Text(
            text = "$label $count",
            style = MaterialTheme.typography.labelSmall,
        )
    }
}
