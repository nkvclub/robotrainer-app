package ru.robotrainer.rustorepay

import android.content.Intent
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import ru.rustore.sdk.pay.RuStorePayClient
import ru.rustore.sdk.pay.model.ProductId
import ru.rustore.sdk.pay.model.ProductPurchaseParams
import ru.rustore.sdk.pay.model.PreferredPurchaseType
import ru.rustore.sdk.pay.model.ProductType
import ru.rustore.sdk.pay.model.PurchaseAvailabilityResult
import ru.rustore.sdk.pay.model.SdkTheme
import ru.rustore.sdk.pay.model.SubscriptionPurchase

/* «Уровень 1» in the RuStore build: yearly subscription through RuStore Pay SDK.
   www/billing.js talks to it; the app opens Level 1 only when RuStore says the subscription is active. */
@CapacitorPlugin(name = "RuStorePay")
class RuStorePayPlugin : Plugin() {

    private val client get() = RuStorePayClient.instance

    override fun load() {
        // back from a bank app (SBP, SberPay) on a cold start
        try { client.getIntentInteractor().proceedIntent(activity.intent, SdkTheme.LIGHT) } catch (e: Throwable) {}
    }

    override fun handleOnNewIntent(intent: Intent) {
        try { client.getIntentInteractor().proceedIntent(intent, SdkTheme.LIGHT) } catch (e: Throwable) {}
    }

    @PluginMethod
    fun available(call: PluginCall) {
        client.getPurchaseInteractor().getPurchaseAvailability()
            .addOnSuccessListener { r ->
                val o = JSObject()
                o.put("available", r is PurchaseAvailabilityResult.Available)
                if (r is PurchaseAvailabilityResult.Unavailable) o.put("error", r.cause.message ?: r.cause.javaClass.simpleName)
                call.resolve(o)
            }
            .addOnFailureListener { e -> call.reject(e.message ?: e.javaClass.simpleName) }
    }

    @PluginMethod
    fun product(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("no id")
        client.getProductInteractor().getProducts(listOf(ProductId(id)))
            .addOnSuccessListener { list ->
                val p = list.firstOrNull()
                val o = JSObject()
                if (p != null) {
                    o.put("id", p.productId.value)
                    o.put("price", p.amountLabel.value)
                }
                call.resolve(o)
            }
            .addOnFailureListener { e -> call.reject(e.message ?: e.javaClass.simpleName) }
    }

    @PluginMethod
    fun purchases(call: PluginCall) {
        client.getPurchaseInteractor().getPurchases(ProductType.SUBSCRIPTION, null, null)
            .addOnSuccessListener { list -> call.resolve(JSObject().put("items", subs(list))) }
            .addOnFailureListener { e -> call.reject(e.message ?: e.javaClass.simpleName) }
    }

    @PluginMethod
    fun buy(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("no id")
        val params = ProductPurchaseParams(productId = ProductId(id))
        client.getPurchaseInteractor()
            .purchase(params, PreferredPurchaseType.ONE_STEP, SdkTheme.LIGHT, null)
            .addOnSuccessListener { r ->
                call.resolve(JSObject().put("ok", true).put("sandbox", r.sandbox))
            }
            .addOnFailureListener { e ->
                // the person closed the payment sheet: not an error to show
                val cancelled = e.javaClass.simpleName.contains("Cancel")
                call.resolve(JSObject().put("ok", false).put("cancelled", cancelled).put("error", e.message ?: e.javaClass.simpleName))
            }
    }

    @PluginMethod
    fun openStore(call: PluginCall) {
        // subscriptions are managed in the RuStore app: Профиль → Подписки
        val i = context.packageManager.getLaunchIntentForPackage("ru.vk.store")
        if (i == null) return call.resolve(JSObject().put("ok", false))
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(i)
        call.resolve(JSObject().put("ok", true))
    }

    private fun subs(list: List<Any>): JSArray {
        val a = JSArray()
        for (x in list) {
            if (x !is SubscriptionPurchase) continue
            val o = JSObject()
            o.put("id", x.productId.value)
            o.put("status", x.status.name)
            o.put("until", x.expirationDate.time)
            o.put("sandbox", x.sandbox)
            a.put(o)
        }
        return a
    }
}
