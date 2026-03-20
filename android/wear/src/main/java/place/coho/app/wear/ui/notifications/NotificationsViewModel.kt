package place.coho.app.wear.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import place.coho.app.wear.api.models.Notification
import place.coho.app.wear.data.NotificationRepository
import place.coho.app.wear.sync.AuthState

sealed interface NotificationsUiState {
    data object Loading : NotificationsUiState
    data class Success(
        val notifications: List<Notification>,
        val isLoadingMore: Boolean = false,
        val canLoadMore: Boolean = true,
    ) : NotificationsUiState
    data class Error(val message: String) : NotificationsUiState
}

class NotificationsViewModel(
    private val repository: NotificationRepository = NotificationRepository(),
) : ViewModel() {

    private val _uiState = MutableStateFlow<NotificationsUiState>(NotificationsUiState.Loading)
    val uiState: StateFlow<NotificationsUiState> = _uiState

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private var currentAuth: AuthState? = null

    fun loadNotifications(auth: AuthState) {
        currentAuth = auth
        viewModelScope.launch {
            _uiState.value = NotificationsUiState.Loading
            try {
                val notifications = repository.getNotifications(auth)
                _uiState.value = NotificationsUiState.Success(notifications)
            } catch (e: Exception) {
                _uiState.value = NotificationsUiState.Error(
                    e.message ?: "Failed to load notifications"
                )
            }
        }
    }

    fun refresh() {
        val auth = currentAuth ?: return
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                val notifications = repository.getNotifications(auth)
                _uiState.value = NotificationsUiState.Success(notifications)
            } catch (_: Exception) {
                // Keep existing content on refresh failure
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun loadMore() {
        val auth = currentAuth ?: return
        val currentState = _uiState.value as? NotificationsUiState.Success ?: return
        if (currentState.isLoadingMore || !currentState.canLoadMore) return
        val lastId = currentState.notifications.lastOrNull()?.id ?: return

        _uiState.value = currentState.copy(isLoadingMore = true)

        viewModelScope.launch {
            try {
                val olderNotifications = repository.getNotifications(auth, maxId = lastId)
                val current = (_uiState.value as? NotificationsUiState.Success) ?: return@launch
                _uiState.value = current.copy(
                    notifications = current.notifications + olderNotifications,
                    isLoadingMore = false,
                    canLoadMore = olderNotifications.isNotEmpty(),
                )
            } catch (_: Exception) {
                val current = (_uiState.value as? NotificationsUiState.Success) ?: return@launch
                _uiState.value = current.copy(isLoadingMore = false)
            }
        }
    }
}
