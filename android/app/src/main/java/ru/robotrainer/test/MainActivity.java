package ru.robotrainer.test;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep the designed text size: a large system font made texts overflow the circle and cards
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
