package place.coho.app.wear.ui.timeline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.TextButton
import place.coho.app.wear.R
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.sync.AuthState

@Composable
fun TimelineScreen(
    auth: AuthState?,
    onNavigateToNotifications: (() -> Unit)? = null,
    onPostClick: ((Status) -> Unit)? = null,
    viewModel: TimelineViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(auth) {
        viewModel.loadTimeline(auth)
    }

    when (val state = uiState) {
        is TimelineUiState.Loading -> {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize(),
            ) {
                CircularProgressIndicator()
            }
        }

        is TimelineUiState.Error -> {
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

        is TimelineUiState.Success -> {
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
                        Text(
                            if (auth?.isAuthenticated == true)
                                stringResource(R.string.timeline_title)
                            else
                                stringResource(R.string.trending_title)
                        )
                    }
                }

                items(state.posts, key = { it.id }) { status ->
                    PostCard(
                        status = status,
                        onFavourite = if (viewModel.isAuthenticated) {
                            { viewModel.toggleFavourite(it) }
                        } else null,
                        onBoost = if (viewModel.isAuthenticated) {
                            { viewModel.toggleBoost(it) }
                        } else null,
                        onClick = { onPostClick?.invoke(status) },
                    )
                }

                // Navigate to notifications (authenticated only)
                if (onNavigateToNotifications != null) {
                    item {
                        TextButton(
                            onClick = onNavigateToNotifications,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("🔔 ${stringResource(R.string.notifications_title)}")
                        }
                    }
                }

                // Refresh button at the bottom
                item {
                    TextButton(
                        onClick = { viewModel.refresh() },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Refresh")
                    }
                }
                }
            }
        }
    }
}
