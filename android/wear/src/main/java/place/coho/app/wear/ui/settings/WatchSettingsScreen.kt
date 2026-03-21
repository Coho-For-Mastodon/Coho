package place.coho.app.wear.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.FilledTonalButton
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.launch
import place.coho.app.wear.R
import place.coho.app.wear.sync.AuthRepository

@Composable
fun WatchSettingsScreen(
    authRepository: AuthRepository,
    onLoggedOut: () -> Unit,
) {
    val listState = rememberScalingLazyListState()
    val config = LocalConfiguration.current
    val horizontalPadding = (config.screenWidthDp * 0.052f).dp
    val verticalPadding = if (config.isScreenRound) (config.screenHeightDp * 0.22f).dp else 24.dp
    val columnPadding = PaddingValues(
        horizontal = horizontalPadding,
        vertical = verticalPadding,
    )
    val scope = rememberCoroutineScope()
    var confirmingLogout by remember { mutableStateOf(false) }

    ScreenScaffold(
        scrollState = listState,
    ) {
        ScalingLazyColumn(
            state = listState,
            verticalArrangement = Arrangement.spacedBy(4.dp),
            contentPadding = columnPadding,
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                ListHeader {
                    Text(stringResource(R.string.settings_title))
                }
            }

            item {
                if (confirmingLogout) {
                    FilledTonalButton(
                        onClick = {
                            scope.launch {
                                authRepository.clear()
                                onLoggedOut()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = stringResource(R.string.logout_confirm),
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                } else {
                    FilledTonalButton(
                        onClick = { confirmingLogout = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.logout_button))
                    }
                }
            }
        }
    }
}
