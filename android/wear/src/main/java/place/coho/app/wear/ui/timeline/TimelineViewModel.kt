package place.coho.app.wear.ui.timeline

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import place.coho.app.wear.api.models.Status
import place.coho.app.wear.data.TimelineRepository
import place.coho.app.wear.sync.AuthState

sealed interface TimelineUiState {
    data object Loading : TimelineUiState
    data class Success(
        val posts: List<Status>,
        val isLoadingMore: Boolean = false,
        val canLoadMore: Boolean = true,
    ) : TimelineUiState
    data class Error(val message: String) : TimelineUiState
}

class TimelineViewModel(
    private val repository: TimelineRepository = TimelineRepository(),
) : ViewModel() {

    private val _uiState = MutableStateFlow<TimelineUiState>(TimelineUiState.Loading)
    val uiState: StateFlow<TimelineUiState> = _uiState

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private var currentAuth: AuthState? = null
    val isAuthenticated: Boolean get() = currentAuth?.isAuthenticated == true

    fun loadTimeline(auth: AuthState?) {
        currentAuth = auth
        viewModelScope.launch {
            _uiState.value = TimelineUiState.Loading
            try {
                val posts = if (auth != null && auth.isAuthenticated) {
                    repository.getHomeTimeline(auth)
                } else {
                    repository.getPublicTimeline()
                }
                _uiState.value = TimelineUiState.Success(posts)
            } catch (e: Exception) {
                _uiState.value = TimelineUiState.Error(
                    e.message ?: "Failed to load timeline"
                )
            }
        }
    }

    fun refresh() {
        val auth = currentAuth
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                val posts = if (auth != null && auth.isAuthenticated) {
                    repository.getHomeTimeline(auth)
                } else {
                    repository.getPublicTimeline()
                }
                _uiState.value = TimelineUiState.Success(posts)
            } catch (_: Exception) {
                // Keep existing content on refresh failure
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun loadMore() {
        val auth = currentAuth
        val currentState = _uiState.value as? TimelineUiState.Success ?: return
        if (currentState.isLoadingMore || !currentState.canLoadMore) return
        val lastId = currentState.posts.lastOrNull()?.id ?: return

        _uiState.value = currentState.copy(isLoadingMore = true)

        viewModelScope.launch {
            try {
                val olderPosts = if (auth != null && auth.isAuthenticated) {
                    repository.getHomeTimeline(auth, maxId = lastId)
                } else {
                    emptyList()
                }
                val current = (_uiState.value as? TimelineUiState.Success) ?: return@launch
                _uiState.value = current.copy(
                    posts = current.posts + olderPosts,
                    isLoadingMore = false,
                    canLoadMore = olderPosts.isNotEmpty(),
                )
            } catch (_: Exception) {
                val current = (_uiState.value as? TimelineUiState.Success) ?: return@launch
                _uiState.value = current.copy(isLoadingMore = false)
            }
        }
    }

    fun toggleFavourite(statusId: String) {
        val auth = currentAuth ?: return
        val currentState = _uiState.value as? TimelineUiState.Success ?: return

        // Optimistic update
        val updatedPosts = currentState.posts.map { status ->
            val target = status.reblog ?: status
            if (target.id == statusId) {
                val updated = target.copy(
                    favourited = !target.favourited,
                    favouritesCount = target.favouritesCount + if (target.favourited) -1 else 1,
                )
                if (status.reblog != null) status.copy(reblog = updated) else updated
            } else {
                status
            }
        }
        _uiState.value = TimelineUiState.Success(updatedPosts)

        // Fire API call
        viewModelScope.launch {
            try {
                val target = currentState.posts.firstNotNullOfOrNull { s ->
                    val t = s.reblog ?: s; if (t.id == statusId) t else null
                } ?: return@launch
                if (target.favourited) {
                    repository.unfavouriteStatus(auth, statusId)
                } else {
                    repository.favouriteStatus(auth, statusId)
                }
            } catch (_: Exception) {
                // Revert on failure
                refresh()
            }
        }
    }

    fun toggleBoost(statusId: String) {
        val auth = currentAuth ?: return
        val currentState = _uiState.value as? TimelineUiState.Success ?: return

        // Optimistic update
        val updatedPosts = currentState.posts.map { status ->
            val target = status.reblog ?: status
            if (target.id == statusId) {
                val updated = target.copy(
                    reblogged = !target.reblogged,
                    reblogsCount = target.reblogsCount + if (target.reblogged) -1 else 1,
                )
                if (status.reblog != null) status.copy(reblog = updated) else updated
            } else {
                status
            }
        }
        _uiState.value = TimelineUiState.Success(updatedPosts)

        // Fire API call
        viewModelScope.launch {
            try {
                val target = currentState.posts.firstNotNullOfOrNull { s ->
                    val t = s.reblog ?: s; if (t.id == statusId) t else null
                } ?: return@launch
                if (target.reblogged) {
                    repository.unreblogStatus(auth, statusId)
                } else {
                    repository.reblogStatus(auth, statusId)
                }
            } catch (_: Exception) {
                refresh()
            }
        }
    }
}
