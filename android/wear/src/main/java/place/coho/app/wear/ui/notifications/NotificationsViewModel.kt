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
    data class Success(val notifications: List<Notification>) : NotificationsUiState
    data class Error(val message: String) : NotificationsUiState
}

class NotificationsViewModel(
    private val repository: NotificationRepository = NotificationRepository(),
) : ViewModel() {

    private val _uiState = MutableStateFlow<NotificationsUiState>(NotificationsUiState.Loading)
    val uiState: StateFlow<NotificationsUiState> = _uiState

    fun loadNotifications(auth: AuthState) {
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
}
