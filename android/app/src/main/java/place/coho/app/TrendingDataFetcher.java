package place.coho.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class TrendingDataFetcher {

    public static class TrendingTag {
        public final String name;
        public final String uses;

        public TrendingTag(String name, String uses) {
            this.name = name;
            this.uses = uses;
        }
    }

    /**
     * Fetches trending tags from the Mastodon API.
     * This endpoint is public and does not require authentication.
     */
    public static List<TrendingTag> fetchTrendingTags(String server) {
        List<TrendingTag> tags = new ArrayList<>();
        HttpURLConnection conn = null;
        try {
            URL url = new URL("https://" + server + "/api/v1/trends/tags");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(10_000);
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() == 200) {
                InputStream is = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONArray array = new JSONArray(sb.toString());
                int limit = Math.min(array.length(), 5);
                for (int i = 0; i < limit; i++) {
                    JSONObject obj = array.getJSONObject(i);
                    String name = obj.optString("name", "");
                    String uses = "0";
                    JSONArray history = obj.optJSONArray("history");
                    if (history != null && history.length() > 0) {
                        uses = history.getJSONObject(0).optString("uses", "0");
                    }
                    if (!name.isEmpty()) {
                        tags.add(new TrendingTag(name, uses));
                    }
                }
            }
        } catch (Exception e) {
            // Network or parse error — return empty list, widget will show fallback
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
        return tags;
    }
}
