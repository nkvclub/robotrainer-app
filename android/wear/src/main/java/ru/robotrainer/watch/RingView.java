package ru.robotrainer.watch;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.view.View;
import java.util.Locale;

/* One screen, drawn by hand: dark background (watches keep it black for the battery), the app's blue / red / green.
   No numbers during a hold, only the ring's colour, like on the phone */
public class RingView extends View {
    static final int BLUE = 0xFF0A6FE0, BLUE2 = 0xFF4D9BFF, RED = 0xFFE53935, GREEN = 0xFF43A047,
        DIM = 0xFF3A4250, TRACK_BLUE = 0xFF1D3557, TRACK_RED = 0xFF3B1A1A, MUTED = 0xFFB8C7DD;

    final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    final RectF r = new RectF();
    final Bitmap logo;
    MainActivity a;
    Resources res;
    String resLang = "?";

    public RingView(Context c) {
        super(c);
        setBackgroundColor(0xFF000000);
        logo = BitmapFactory.decodeResource(c.getResources(), R.drawable.logo);
    }

    void show(MainActivity a) {
        this.a = a;
        invalidate();
    }

    /* texts in the language chosen in the phone app, not the watch's own */
    String t(int id) {
        if (!a.lang.equals(resLang)) {
            resLang = a.lang;
            Configuration c = new Configuration(getContext().getResources().getConfiguration());
            if (!a.lang.isEmpty()) c.setLocale(new Locale(a.lang));
            res = getContext().createConfigurationContext(c).getResources();
        }
        return res.getString(id);
    }

    @Override protected void onDraw(Canvas c) {
        if (a == null) return;
        float w = getWidth(), hgt = getHeight(), s = Math.min(w, hgt), cx = w / 2, cy = hgt / 2;
        long now = System.currentTimeMillis();
        float ring = s * 0.045f, rad = s / 2 - ring;
        String st = a.st;

        if (!a.phone && (st.equals("idle") || st.equals("done"))) { text(c, t(R.string.nophone), cx, cy, s * 0.085f, 0xFFFFFFFF); return; }

        switch (st) {
            case "rest": {
                long left = Math.max(0, a.end - now);
                float frac = Math.min(1f, left / 30000f);
                arc(c, cx, cy, rad, ring, TRACK_BLUE, 1f);
                arc(c, cx, cy, rad, ring, BLUE, frac);
                dots(c, cx, cy - s * 0.2f, s);
                int sec = (int) Math.ceil(left / 1000.0);
                p.setTypeface(Typeface.MONOSPACE);
                p.setFakeBoldText(true);
                text(c, String.format(Locale.US, "%d:%02d", sec / 60, sec % 60), cx, cy + s * 0.02f, s * 0.2f, 0xFFFFFFFF);
                p.setFakeBoldText(false);
                text(c, t(R.string.rest), cx, cy + s * 0.17f, s * 0.07f, MUTED);
                break;
            }
            case "ready":
                dots(c, cx, cy - s * 0.3f, s);
                button(c, cx, cy - s * 0.02f, s * 0.22f, BLUE2, BLUE, t(R.string.start), s);
                text(c, t(a.inh ? R.string.inhale_go : R.string.exhale_go), cx, cy + s * 0.31f, s * 0.068f, 0xFFFFFFFF);
                break;
            case "hold": {
                long el = Math.max(0, now - a.t0);
                boolean green = a.goal > 0 && el >= a.goal * 1000L;
                if (green) {
                    arc(c, cx, cy, rad, ring, GREEN, 1f);
                } else if (a.goal > 0) {
                    arc(c, cx, cy, rad, ring, TRACK_RED, 1f);
                    arc(c, cx, cy, rad, ring, RED, el / (a.goal * 1000f));
                } else {  // the first set and the control: as long as you can, so the ring just goes round
                    arc(c, cx, cy, rad, ring, TRACK_RED, 1f);
                    arc(c, cx, cy, rad, ring, RED, (el % 30000) / 30000f);
                }
                dots(c, cx, cy - s * 0.3f, s);
                button(c, cx, cy - s * 0.02f, s * 0.22f, green ? 0xFF7BD67F : 0xFFFF6B66, green ? GREEN : RED, t(R.string.stop), s);
                text(c, t(green ? R.string.can_breathe : R.string.hold), cx, cy + s * 0.31f, s * 0.068f, 0xFFFFFFFF);
                break;
            }
            case "done": {
                float br = s * 0.16f, by = cy - s * 0.14f;
                button(c, cx, by, br, 0xFF7BD67F, GREEN, "", s);
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(s * 0.03f);
                p.setStrokeCap(Paint.Cap.ROUND);
                p.setStrokeJoin(Paint.Join.ROUND);
                p.setColor(0xFFFFFFFF);
                Path k = new Path();
                k.moveTo(cx - br * 0.4f, by);
                k.lineTo(cx - br * 0.1f, by + br * 0.3f);
                k.lineTo(cx + br * 0.42f, by - br * 0.28f);
                c.drawPath(k, p);
                p.setStyle(Paint.Style.FILL);
                text(c, t(R.string.done), cx, cy + s * 0.19f, s * 0.07f, 0xFFFFFFFF);
                break;
            }
            default: {
                float lw = s * 0.22f;
                if (logo != null) {
                    r.set(cx - lw / 2, cy - s * 0.27f, cx + lw / 2, cy - s * 0.27f + lw);
                    c.drawBitmap(logo, null, r, p);
                }
                text(c, t(st.equals("intro") ? R.string.look : R.string.wait), cx, cy + s * 0.12f, s * 0.075f, 0xFFFFFFFF);
            }
        }
    }

    void arc(Canvas c, float cx, float cy, float rad, float wdt, int color, float frac) {
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(wdt);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(color);
        r.set(cx - rad, cy - rad, cx + rad, cy + rad);
        if (frac >= 1f) c.drawOval(r, p);
        else if (frac > 0f) c.drawArc(r, -90, 360 * frac, false, p);
        p.setStyle(Paint.Style.FILL);
    }

    void button(Canvas c, float cx, float cy, float rad, int light, int color, String label, float s) {
        p.setStyle(Paint.Style.FILL);
        p.setShader(new android.graphics.RadialGradient(cx - rad * 0.3f, cy - rad * 0.4f, rad * 1.4f,
            light, color, android.graphics.Shader.TileMode.CLAMP));
        c.drawCircle(cx, cy, rad, p);
        p.setShader(null);
        if (!label.isEmpty()) {
            p.setTypeface(Typeface.DEFAULT_BOLD);
            text(c, label, cx, cy, s * 0.085f, 0xFFFFFFFF);
        }
    }

    /* one dot per step: green done, grey missed, blue now */
    void dots(Canvas c, float cx, float y, float s) {
        int n = a.dots.length;
        if (n == 0) return;
        float d = s * 0.038f, gap = s * 0.022f, x = cx - (n * d + (n - 1) * gap) / 2 + d / 2;
        for (String k : a.dots) {
            p.setColor(k.equals("ok") ? GREEN : k.equals("cur") ? BLUE2 : DIM);
            c.drawCircle(x, y, d / 2, p);
            x += d + gap;
        }
    }

    /* centred text, several lines */
    void text(Canvas c, String txt, float cx, float cy, float size, int color) {
        p.setTextSize(size);
        p.setColor(color);
        p.setTextAlign(Paint.Align.CENTER);
        if (p.getTypeface() == null || p.getTypeface() == Typeface.DEFAULT) p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        String[] lines = txt.split("\n");
        float lh = size * 1.22f, y = cy - lh * (lines.length - 1) / 2 - (p.ascent() + p.descent()) / 2;
        for (String l : lines) { c.drawText(l, cx, y, p); y += lh; }
        p.setTypeface(null);
    }
}
