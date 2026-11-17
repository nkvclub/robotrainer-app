package ru.robotrainer.app;

import android.content.Intent;
import android.net.Uri;
import androidx.wear.remote.interactions.RemoteActivityHelper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/* Link to the watch remote (android/wear): the exercise state goes to the watch as one data item,
   START/STOP taps on the watch come back as messages with the time of the tap.
   Phones without Google services (some RuStore phones) just have no watch: every call fails quietly. */
@CapacitorPlugin(name = "Watch")
public class WatchPlugin extends Plugin implements MessageClient.OnMessageReceivedListener {
    static final String STATE = "/rt/state", TAP = "/rt/tap", CAP = "robotrainer_watch";

    @Override
    public void load() {
        try { Wearable.getMessageClient(getContext()).addListener(this); } catch (Exception ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        try { Wearable.getMessageClient(getContext()).removeListener(this); } catch (Exception ignored) {}
    }

    @Override
    public void onMessageReceived(MessageEvent e) {
        if (!TAP.equals(e.getPath())) return;
        JSObject o = new JSObject();
        try { o.put("at", Long.parseLong(new String(e.getData(), StandardCharsets.UTF_8))); } catch (Exception ignored) {}
        notifyListeners("tap", o);
    }

    @PluginMethod
    public void send(PluginCall call) {
        try {
            PutDataMapRequest r = PutDataMapRequest.create(STATE);
            r.getDataMap().putString("s", call.getString("s", "{}"));
            r.getDataMap().putLong("n", System.nanoTime());  // every send is a change, even with the same state
            Wearable.getDataClient(getContext()).putDataItem(r.asPutDataRequest().setUrgent());
        } catch (Exception ignored) {}
        call.resolve();
    }

    /* how many watches with the app are connected now */
    @PluginMethod
    public void watches(PluginCall call) {
        try {
            Wearable.getCapabilityClient(getContext()).getCapability(CAP, CapabilityClient.FILTER_REACHABLE)
                .addOnSuccessListener(info -> { JSObject o = new JSObject(); o.put("n", info.getNodes().size()); call.resolve(o); })
                .addOnFailureListener(err -> { JSObject o = new JSObject(); o.put("n", 0); call.resolve(o); });
        } catch (Exception ex) {
            JSObject o = new JSObject();
            o.put("n", 0);
            call.resolve(o);
        }
    }

    /* opens the app on the watch, so nobody has to look for it */
    @PluginMethod
    public void open(PluginCall call) {
        try {
            Wearable.getCapabilityClient(getContext()).getCapability(CAP, CapabilityClient.FILTER_REACHABLE)
                .addOnSuccessListener(info -> {
                    RemoteActivityHelper rah = new RemoteActivityHelper(getContext(), Executors.newSingleThreadExecutor());
                    Intent i = new Intent(Intent.ACTION_VIEW).addCategory(Intent.CATEGORY_BROWSABLE).setData(Uri.parse("robotrainer://watch"));
                    for (Node n : info.getNodes()) rah.startRemoteActivity(i, n.getId());
                });
        } catch (Exception ignored) {}
        call.resolve();
    }
}
