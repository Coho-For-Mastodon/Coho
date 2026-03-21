package place.coho.app.wear.ui.theme

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.dynamicColorScheme

// Coho brand colors — used as fallback when dynamic colors are unavailable
val CohoPink = Color(0xFFD6325C)
val CohoPinkLight = Color(0xFFE6A3B5)
val CohoPinkDark = Color(0xFFA82048)

private val FallbackColorScheme = ColorScheme(
    primary = CohoPink,
    onPrimary = Color.White,
    primaryContainer = CohoPinkDark,
    onPrimaryContainer = CohoPinkLight,
    secondary = CohoPinkLight,
    onSecondary = Color.Black,
    onSurface = Color(0xFFE6E1E5),
    onSurfaceVariant = Color(0xFFCAC4D0),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410),
)

@Composable
fun CohoWearTheme(content: @Composable () -> Unit) {
    val colorScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        dynamicColorScheme(LocalContext.current) ?: FallbackColorScheme
    } else {
        FallbackColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
