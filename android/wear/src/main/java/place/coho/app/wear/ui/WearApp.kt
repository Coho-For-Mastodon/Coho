package place.coho.app.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import kotlinx.coroutines.launch
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.sync.AuthRepository
import place.coho.app.wear.sync.AuthState
import place.coho.app.wear.ui.compose.ComposeScreen
import place.coho.app.wear.ui.notifications.NotificationsScreen
import place.coho.app.wear.ui.settings.WatchSettingsScreen
import place.coho.app.wear.ui.theme.CohoWearTheme
import place.coho.app.wear.ui.timeline.PostDetailScreen
import place.coho.app.wear.ui.timeline.TimelineScreen
import place.coho.app.wear.ui.timeline.TimelineViewModel

@Composable
fun WearApp(authRepository: AuthRepository) {
    val authState by authRepository.authState.collectAsState(
        initial = AuthState("", "", "")
    )

    CohoWearTheme {
        val navController = rememberSwipeDismissableNavController()
        var selectedStatus by remember { mutableStateOf<Status?>(null) }
        var replyToId by remember { mutableStateOf<String?>(null) }
        var replyToAuthor by remember { mutableStateOf<String?>(null) }
        val timelineViewModel: TimelineViewModel = viewModel()

        AppScaffold {
            SwipeDismissableNavHost(
                navController = navController,
                startDestination = "home",
            ) {
            composable("home") {
                if (authState.isAuthenticated) {
                    val pagerState = rememberPagerState(pageCount = { 3 })
                    val coroutineScope = rememberCoroutineScope()

                    Box(modifier = Modifier.fillMaxSize()) {
                        HorizontalPager(
                            state = pagerState,
                            modifier = Modifier.fillMaxSize(),
                        ) { page ->
                            when (page) {
                                0 -> TimelineScreen(
                                    auth = authState,
                                    onNavigateToNotifications = {
                                        coroutineScope.launch {
                                            pagerState.animateScrollToPage(1)
                                        }
                                    },
                                    onPostClick = { status ->
                                        selectedStatus = status
                                        navController.navigate("postDetail")
                                    },
                                    onCompose = {
                                        replyToId = null
                                        replyToAuthor = null
                                        navController.navigate("compose")
                                    },
                                    viewModel = timelineViewModel,
                                )
                                1 -> NotificationsScreen(
                                    auth = authState,
                                    onPostClick = { status ->
                                        selectedStatus = status
                                        navController.navigate("postDetail")
                                    },
                                )
                                2 -> WatchSettingsScreen(
                                    authRepository = authRepository,
                                    onLoggedOut = {},
                                )
                            }
                        }

                        PageIndicator(
                            pageCount = 3,
                            currentPage = pagerState.currentPage,
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 2.dp),
                        )
                    }
                } else {
                    TimelineScreen(
                        auth = null,
                        onNavigateToNotifications = null,
                        onPostClick = { status ->
                            selectedStatus = status
                            navController.navigate("postDetail")
                        },
                        viewModel = timelineViewModel,
                    )
                }
            }

            composable("postDetail") {
                val status = selectedStatus
                if (status != null) {
                    PostDetailScreen(
                        status = status,
                        auth = if (timelineViewModel.isAuthenticated) authState else null,
                        onFavourite = if (timelineViewModel.isAuthenticated) {
                            { timelineViewModel.toggleFavourite(it) }
                        } else null,
                        onBoost = if (timelineViewModel.isAuthenticated) {
                            { timelineViewModel.toggleBoost(it) }
                        } else null,
                        onReply = if (timelineViewModel.isAuthenticated) {
                            { id, author ->
                                replyToId = id
                                replyToAuthor = author
                                navController.navigate("compose")
                            }
                        } else null,
                    )
                }
            }

            composable("compose") {
                ComposeScreen(
                    auth = authState,
                    replyToId = replyToId,
                    replyToAuthor = replyToAuthor,
                    onDismiss = {
                        replyToId = null
                        replyToAuthor = null
                        navController.popBackStack()
                    },
                    onPosted = {
                        replyToId = null
                        replyToAuthor = null
                        navController.popBackStack()
                        timelineViewModel.refresh()
                    },
                )
            }
        }
        }
    }
}

@Composable
private fun PageIndicator(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        horizontalArrangement = Arrangement.Center,
        modifier = modifier,
    ) {
        repeat(pageCount) { index ->
            Box(
                modifier = Modifier
                    .padding(horizontal = 3.dp)
                    .size(if (index == currentPage) 8.dp else 6.dp)
                    .clip(CircleShape)
                    .background(
                        if (index == currentPage) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                    ),
            )
        }
    }
}
