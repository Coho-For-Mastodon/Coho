package place.coho.app.wear.ui.compose

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.FilledTonalButton
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import place.coho.app.wear.R
import place.coho.app.wear.sync.AuthState

@Composable
fun ComposeScreen(
    auth: AuthState,
    onDismiss: () -> Unit,
    onPosted: () -> Unit,
    viewModel: ComposeViewModel = viewModel(),
) {
    val composeState by viewModel.uiState.collectAsState()
    var voiceText by remember { mutableStateOf("") }
    var hasLaunched by remember { mutableStateOf(false) }

    val voiceIntent = remember {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
            putExtra(RecognizerIntent.EXTRA_PROMPT, "What's on your mind?")
        }
    }

    val voiceLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val results = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            voiceText = results?.firstOrNull() ?: ""
        }
    }

    // Auto-launch voice recognizer on first composition
    LaunchedEffect(Unit) {
        if (!hasLaunched) {
            hasLaunched = true
            voiceLauncher.launch(voiceIntent)
        }
    }

    // Navigate back on successful post
    LaunchedEffect(composeState) {
        if (composeState is ComposeUiState.Sent) {
            viewModel.resetState()
            onPosted()
        }
    }

    val listState = rememberScalingLazyListState()
    val config = LocalConfiguration.current
    val horizontalPadding = (config.screenWidthDp * 0.052f).dp
    val verticalPadding = if (config.isScreenRound) (config.screenHeightDp * 0.22f).dp else 24.dp
    val columnPadding = PaddingValues(
        horizontal = horizontalPadding,
        vertical = verticalPadding,
    )

    ScreenScaffold(
        scrollState = listState,
    ) {
        when (composeState) {
            is ComposeUiState.Sending -> {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    CircularProgressIndicator()
                }
            }
            else -> {
                ScalingLazyColumn(
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    contentPadding = columnPadding,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    item {
                        ListHeader {
                            Text(stringResource(R.string.compose_title))
                        }
                    }

                    // Voice text display
                    item {
                        Text(
                            text = voiceText.ifBlank {
                                stringResource(R.string.voice_no_speech)
                            },
                            style = MaterialTheme.typography.bodySmall,
                            lineHeight = 18.sp,
                            textAlign = TextAlign.Center,
                            color = if (voiceText.isBlank()) {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                        )
                    }

                    // Error message
                    if (composeState is ComposeUiState.Error) {
                        item {
                            Text(
                                text = (composeState as ComposeUiState.Error).message,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }

                    // Action buttons
                    if (voiceText.isNotBlank()) {
                        item {
                            FilledTonalButton(
                                onClick = { voiceLauncher.launch(voiceIntent) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(stringResource(R.string.voice_retry))
                            }
                        }

                        item {
                            FilledTonalButton(
                                onClick = { viewModel.postStatus(auth, voiceText) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(stringResource(R.string.compose_post))
                            }
                        }
                    } else {
                        item {
                            FilledTonalButton(
                                onClick = { voiceLauncher.launch(voiceIntent) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(stringResource(R.string.voice_retry))
                            }
                        }
                    }
                }
            }
        }
    }
}
