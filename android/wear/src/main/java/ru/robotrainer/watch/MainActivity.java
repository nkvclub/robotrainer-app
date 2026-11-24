package ru.robotrainer.watch;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/* The watch is only a remote for the exercise (Nov 2026-10-24): the phone runs the steps and keeps the texts,
   the watch shows the circle, the time and START/STOP, and buzzes once per rest, 10 s before it ends (Nov 2026-10-25);
   the ring turning green is silent, nothing should distract a hold.
   Timing is counted here from the phone's wall clock times, so a slow link never moves the buzz. */
public class MainActivity extends Activity implements DataClient.OnDataChangedListener {
    static final String STATE = "/rt/state", TAP = "/rt/tap";

    final Handler h = new Handler(Looper.getMainLooper());
    final Set<String> buzzed = new HashSet<>();
    RingView view;
    String st = "idle", lang = "", id = "";
    long end, t0, shownAt, tapAt;
    int goal, step;
    boolean inh, phone = true;
    String[] dots = new String[0];

    final Runnable tick = new Runnable() {
        @Override public void run() {
            long now = System.currentTimeMillis();
            if (st.equals("rest") && end - now <= 10000 && end - now > 0) buzz(id + "rest:" + step);  // the one buzz: 10 s left, get ready
            if (st.equals("rest") && now >= end) setSt("ready");
            draw();
            h.postDelayed(this, 100);
        }
    };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        view = new RingView(this);
        view.setOnClickListener(v -> tap());
        setContentView(view);
    }

    @Override protected void onResume() {
        super.onResume();
        Wearable.getDataClient(this).addListener(this);
        // the last state the phone sent, so the watch shows the right step when it is opened in the middle
        Wearable.getDataClient(this).getDataItems(new Uri.Builder().scheme("wear").path(STATE).build())
            .addOnSuccessListener(items -> {
                DataItem last = null;
                for (DataItem it : items) last = it;
                if (last != null) apply(DataMapItem.fromDataItem(last).getDataMap().getString("s"), false);
                items.release();
            });
        Wearable.getNodeClient(this).getConnectedNodes().addOnSuccessListener(nodes -> { phone = !nodes.isEmpty(); draw(); });
        h.removeCallbacks(tick);
        h.post(tick);
    }

    @Override protected void onPause() {
        super.onPause();
        Wearable.getDataClient(this).removeListener(this);
    }

    @Override protected void onDestroy() {
        h.removeCallbacks(tick);
        super.onDestroy();
    }

    @Override public void onDataChanged(DataEventBuffer events) {
        for (DataEvent e : events) {
            if (e.getType() == DataEvent.TYPE_CHANGED && STATE.equals(e.getDataItem().getUri().getPath()))
                apply(DataMapItem.fromDataItem(e.getDataItem()).getDataMap().getString("s"), true);
        }
    }

    void apply(String json, boolean fresh) {
        if (json == null) return;
        try {
            JSONObject o = new JSONObject(json);
            long at = o.optLong("at");
            // an old state from a finished exercise: the watch just waits for the phone
            String s = o.optString("st", "idle");
            if (!fresh && System.currentTimeMillis() - at > 10 * 60 * 1000L) s = "idle";
            lang = o.optString("lang", lang);
            id = o.optString("id") + ":";
            step = o.optInt("i");
            end = o.optLong("end");
            t0 = o.optLong("t0");
            goal = o.optInt("goal");
            inh = o.optInt("inh") == 1;
            JSONArray d = o.optJSONArray("dots");
            dots = new String[d == null ? 0 : d.length()];
            for (int i = 0; i < dots.length; i++) dots[i] = d.optString(i);
            if (s.equals("rest") && System.currentTimeMillis() >= end) s = "ready";
            phone = true;
            setSt(s);
            draw();
        } catch (Exception ignored) {}
    }

    void setSt(String s) {
        if (!s.equals(st)) shownAt = System.currentTimeMillis();
        st = s;
        boolean on = s.equals("rest") || s.equals("ready") || s.equals("hold");
        if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    /* START / STOP. Taps right after a change are ignored, so one tap never starts and stops a hold */
    void tap() {
        long now = System.currentTimeMillis();
        if (now - tapAt < 700) return;
        if (st.equals("ready") && now - shownAt > 700) {
            tapAt = now;
            send(now);
            t0 = now;
            setSt("hold");  // shown at once, the phone confirms
        } else if (st.equals("hold") && now - t0 > 1000) {
            tapAt = now;
            send(now);
            end = now + 30000;
            step++;
            setSt("rest");  // the rest starts by itself after STOP, like on the phone
        }
        draw();
    }

    void send(long at) {
        byte[] data = String.valueOf(at).getBytes(StandardCharsets.UTF_8);
        Wearable.getNodeClient(this).getConnectedNodes().addOnSuccessListener(nodes -> {
            phone = !nodes.isEmpty();
            for (Node n : nodes) Wearable.getMessageClient(this).sendMessage(n.getId(), TAP, data);
            draw();
        });
    }

    void buzz(String key) {
        if (!buzzed.add(key)) return;
        Vibrator v = getSystemService(Vibrator.class);
        if (v != null) v.vibrate(VibrationEffect.createWaveform(new long[] {0, 500, 300, 500}, -1));  // two strong pulses, like the phone
    }

    void draw() {
        if (view != null) view.show(this);
    }
}
