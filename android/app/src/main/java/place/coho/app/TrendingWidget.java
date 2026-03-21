package place.coho.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TrendingWidget extends AppWidgetProvider {

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    static final String PREFS_NAME = "coho_widget";
    static final String PREF_SERVER = "server";
    static final String DEFAULT_SERVER = "mastodon.social";

    private static final int[] ITEM_IDS = {
            R.id.item_1, R.id.item_2, R.id.item_3, R.id.item_4, R.id.item_5
    };
    private static final int[] TAG_NAME_IDS = {
            R.id.tag_name_1, R.id.tag_name_2, R.id.tag_name_3, R.id.tag_name_4, R.id.tag_name_5
    };
    private static final int[] TAG_COUNT_IDS = {
            R.id.tag_count_1, R.id.tag_count_2, R.id.tag_count_3, R.id.tag_count_4, R.id.tag_count_5
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        // Show loading placeholder immediately
        RemoteViews loading = buildLoadingView(context);
        manager.updateAppWidget(widgetId, loading);

        executor.execute(() -> {
            String server = getServer(context);
            List<TrendingDataFetcher.TrendingTag> tags = TrendingDataFetcher.fetchTrendingTags(server);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trending);

            // Set up tap-to-open intent on the entire widget
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            if (tags.isEmpty()) {
                // Hide all items, show empty state
                for (int itemId : ITEM_IDS) {
                    views.setViewVisibility(itemId, View.GONE);
                }
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE);
                for (int i = 0; i < ITEM_IDS.length; i++) {
                    if (i < tags.size()) {
                        TrendingDataFetcher.TrendingTag tag = tags.get(i);
                        views.setViewVisibility(ITEM_IDS[i], View.VISIBLE);
                        views.setTextViewText(TAG_NAME_IDS[i], "#" + tag.name);
                        views.setTextViewText(TAG_COUNT_IDS[i],
                                String.format(context.getString(R.string.widget_posts_today), tag.uses));
                    } else {
                        views.setViewVisibility(ITEM_IDS[i], View.GONE);
                    }
                }
            }

            manager.updateAppWidget(widgetId, views);
        });
    }

    private static RemoteViews buildLoadingView(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trending);
        views.setTextViewText(R.id.tag_name_1, "Loading…");
        views.setViewVisibility(R.id.item_1, View.VISIBLE);
        views.setViewVisibility(R.id.tag_count_1, View.GONE);
        for (int i = 1; i < ITEM_IDS.length; i++) {
            views.setViewVisibility(ITEM_IDS[i], View.GONE);
        }
        views.setViewVisibility(R.id.widget_empty, View.GONE);
        return views;
    }

    static String getServer(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(PREF_SERVER, DEFAULT_SERVER);
    }
}
