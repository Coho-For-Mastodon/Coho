package place.coho.app.wear.ui.compose

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import place.coho.app.wear.data.TimelineRepository
import place.coho.app.wear.sync.AuthState

sealed interface ComposeUiState {
    data object Idle : ComposeUiState
    data object Sending : ComposeUiState
    data object Sent : ComposeUiState
    data class Error(val message: String) : ComposeUiState
}

class ComposeViewModel(
    private val repository: TimelineRepository = TimelineRepository(),
) : ViewModel() {

    private val _uiState = MutableStateFlow<ComposeUiState>(ComposeUiState.Idle)
    val uiState: StateFlow<ComposeUiState> = _uiState

    fun postStatus(auth: AuthState, text: String, visibility: String = "public", inReplyToId: String? = null) {
        if (text.isBlank()) return
        viewModelScope.launch {
            _uiState.value = ComposeUiState.Sending
            try {
                repository.postStatus(auth, text, visibility, inReplyToId)
                _uiState.value = ComposeUiState.Sent
            } catch (e: Exception) {
                _uiState.value = ComposeUiState.Error(
                    e.message ?: "Failed to post"
                )
            }
        }
    }

    fun resetState() {
        _uiState.value = ComposeUiState.Idle
    }
}
