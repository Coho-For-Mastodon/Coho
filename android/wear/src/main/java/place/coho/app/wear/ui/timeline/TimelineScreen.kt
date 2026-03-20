package place.coho.app.wear.ui.timeline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.ui.platform.LocalConfiguration
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.TextButton
import place.coho.app.wear.R
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.sync.AuthState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(
    auth: AuthState?,
    onNavigateToNotifications: (() -> Unit)? = null,
    onPostClick: ((Status) -> Unit)? = null,
    onCompose: (() -> Unit)? = null,
    viewModel: TimelineViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()

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
            val config = LocalConfiguration.current
            val horizontalPadding = (config.screenWidthDp * 0.052f).dp
            val verticalPadding = if (config.isScreenRound) (config.screenHeightDp * 0.22f).dp else 24.dp
            val columnPadding = PaddingValues(
                horizontal = horizontalPadding,
                vertical = verticalPadding,
            )

            // Trigger load-more when near the end of the list
            val shouldLoadMore by remember {
                derivedStateOf {
                    val lastVisibleIndex = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                    val totalItems = listState.layoutInfo.totalItemsCount
                    lastVisibleIndex >= totalItems - 3 && totalItems > 0
                }
            }
            LaunchedEffect(shouldLoadMore) {
                if (shouldLoadMore && state.canLoadMore && !state.isLoadingMore) {
                    viewModel.loadMore()
                }
            }

            ScreenScaffold(
                scrollState = listState,
            ) {
                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier.fillMaxSize(),
                ) {
                ScalingLazyColumn(
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    contentPadding = columnPadding,
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

                // New post button (authenticated only)
                if (onCompose != null) {
                    item {
                        Button(
                            onClick = onCompose,
                            modifier = Modifier.fillMaxWidth(),
                            icon = {
                                Icon(
                                    painter = painterResource(R.drawable.ic_add),
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                )
                            },
                            label = { Text(stringResource(R.string.voice_compose)) },
                        )
                    }
                }

                // Spacer between button and posts
                if (onCompose != null) {
                    item {
                        androidx.compose.foundation.layout.Spacer(
                            modifier = Modifier.padding(bottom = 4.dp),
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

                // Loading more indicator
                if (state.isLoadingMore) {
                    item {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.fillMaxWidth().padding(8.dp),
                        ) {
                            CircularProgressIndicator()
                        }
                    }
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
                }
                }
            }
        }
    }
}
