package place.coho.app.wear.ui.timeline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Card
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import coil.compose.AsyncImage
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.ui.components.htmlToPlainText
import place.coho.app.wear.ui.components.relativeTime

@Composable
fun PostCard(
    status: Status,
    onFavourite: ((String) -> Unit)?,
    onBoost: ((String) -> Unit)?,
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    // Show the actual content post (unwrap boosts)
    val displayStatus = status.reblog ?: status
    val isBoosted = status.reblog != null

    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(4.dp)) {
            // Boost indicator
            if (isBoosted) {
                Text(
                    text = "\uD83D\uDD01 ${status.account.displayName} boosted",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(2.dp))
            }

            // Author row: avatar + name + time
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                AsyncImage(
                    model = displayStatus.account.avatar,
                    contentDescription = null,
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = displayStatus.account.displayName.ifBlank { displayStatus.account.username },
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = relativeTime(displayStatus.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Content warning
            if (displayStatus.spoilerText.isNotBlank()) {
                Text(
                    text = "⚠️ ${displayStatus.spoilerText}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            } else {
                // Post content (HTML → plain text, truncated)
                Text(
                    text = htmlToPlainText(displayStatus.content),
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 16.sp,
                )
            }

            // Media indicator
            if (displayStatus.mediaAttachments.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "📎 ${displayStatus.mediaAttachments.size} attachment(s)",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Quick actions row (only when authenticated)
            if (onFavourite != null || onBoost != null) {
                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    // Favourite button
                    if (onFavourite != null) {
                        ActionChip(
                            label = if (displayStatus.favourited) "❤\uFE0F" else "\uD83E\uDD0D",
                            count = displayStatus.favouritesCount,
                            onClick = { onFavourite(displayStatus.id) },
                        )
                    }
                    // Boost button
                    if (onBoost != null) {
                        ActionChip(
                            label = if (displayStatus.reblogged) "\uD83D\uDD01" else "\uD83D\uDD04",
                            count = displayStatus.reblogsCount,
                            onClick = { onBoost(displayStatus.id) },
                        )
                    }
                    // Reply count (read-only)
                    Text(
                        text = "\uD83D\uDCAC ${displayStatus.repliesCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            } else {
                // Read-only stats row
                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "❤\uFE0F ${displayStatus.favouritesCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "\uD83D\uDD01 ${displayStatus.reblogsCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "\uD83D\uDCAC ${displayStatus.repliesCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
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
