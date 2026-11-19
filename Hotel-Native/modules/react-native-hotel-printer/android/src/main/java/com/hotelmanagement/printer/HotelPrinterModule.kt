package com.hotelmanagement.printer

import android.content.Intent
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class HotelPrinterModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "HotelPrinterModule"

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val btManager = BluetoothPrinterManager.getInstance(reactContext)
    private val usbManager = UsbPrinterManager.getInstance(reactContext)
    private val netManager = NetworkPrinterManager.getInstance()

    @ReactMethod
    fun scanBluetoothPrinters(promise: Promise) {
        try {
            val list = btManager.getPairedDevices()
            val array = WritableNativeArray()
            for (item in list) {
                val map = WritableNativeMap()
                map.putString("name", item["name"] as? String ?: "")
                map.putString("address", item["address"] as? String ?: "")
                map.putString("type", "BLUETOOTH")
                map.putBoolean("isPrinter", item["isPrinter"] as? Boolean ?: false)
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun scanUsbPrinters(promise: Promise) {
        try {
            val list = usbManager.getConnectedUsbPrinters()
            val array = WritableNativeArray()
            for (item in list) {
                val map = WritableNativeMap()
                map.putInt("id", item["id"] as? Int ?: 0)
                map.putString("name", item["name"] as? String ?: "")
                map.putInt("vendorId", item["vendorId"] as? Int ?: 0)
                map.putInt("productId", item["productId"] as? Int ?: 0)
                map.putString("type", "USB")
                map.putBoolean("isPrinter", item["isPrinter"] as? Boolean ?: false)
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("USB_SCAN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkNetworkPrinter(ipAddress: String, port: Int, promise: Promise) {
        scope.launch {
            try {
                val isOnline = netManager.checkPrinterOnline(ipAddress, port)
                promise.resolve(isOnline)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun connectBluetooth(macAddress: String, promise: Promise) {
        scope.launch {
            val res = btManager.connect(macAddress)
            if (res.isSuccess) {
                promise.resolve(true)
            } else {
                promise.reject("CONNECT_ERROR", res.exceptionOrNull()?.message)
            }
        }
    }

    @ReactMethod
    fun connectUsb(deviceId: Int, promise: Promise) {
        scope.launch {
            val res = usbManager.connect(deviceId)
            if (res.isSuccess) {
                promise.resolve(true)
            } else {
                promise.reject("CONNECT_USB_ERROR", res.exceptionOrNull()?.message)
            }
        }
    }

    @ReactMethod
    fun disconnect(connectionType: String, promise: Promise) {
        try {
            when (connectionType.uppercase()) {
                "BLUETOOTH" -> btManager.disconnect()
                "USB" -> usbManager.disconnect()
                else -> {
                    btManager.disconnect()
                    usbManager.disconnect()
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISCONNECT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val map = WritableNativeMap()
        map.putBoolean("bluetoothConnected", btManager.isPrinterConnected())
        map.putString("bluetoothDeviceName", btManager.getConnectedDeviceName() ?: "")
        map.putString("bluetoothAddress", btManager.getConnectedDeviceAddress() ?: "")
        map.putBoolean("usbConnected", usbManager.isPrinterConnected())
        map.putString("usbDeviceName", usbManager.getConnectedDeviceName() ?: "")
        map.putBoolean("bluetoothAvailable", btManager.isBluetoothAvailable)
        map.putBoolean("bluetoothEnabled", btManager.isBluetoothEnabled)
        promise.resolve(map)
    }

    @ReactMethod
    fun printRawEscPos(
        base64Data: String,
        connectionType: String,
        target: String,
        port: Int,
        promise: Promise
    ) {
        scope.launch {
            try {
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                when (connectionType.uppercase()) {
                    "BLUETOOTH" -> {
                        if (!btManager.isPrinterConnected() && target.isNotEmpty()) {
                            val connRes = btManager.connect(target)
                            if (connRes.isFailure) {
                                promise.reject("PRINT_ERROR", "Could not connect to Bluetooth printer $target")
                                return@launch
                            }
                        }
                        val printRes = btManager.printBytes(bytes)
                        if (printRes.isSuccess) promise.resolve(true)
                        else promise.reject("PRINT_ERROR", printRes.exceptionOrNull()?.message)
                    }
                    "USB" -> {
                        val deviceId = target.toIntOrNull() ?: 0
                        if (!usbManager.isPrinterConnected() && deviceId > 0) {
                            val connRes = usbManager.connect(deviceId)
                            if (connRes.isFailure) {
                                promise.reject("PRINT_ERROR", "Could not connect to USB printer")
                                return@launch
                            }
                        }
                        val printRes = usbManager.printBytes(bytes)
                        if (printRes.isSuccess) promise.resolve(true)
                        else promise.reject("PRINT_ERROR", printRes.exceptionOrNull()?.message)
                    }
                    "NETWORK" -> {
                        val actualPort = if (port > 0) port else 9100
                        val printRes = netManager.printBytes(target, actualPort, bytes)
                        if (printRes.isSuccess) promise.resolve(true)
                        else promise.reject("PRINT_ERROR", printRes.exceptionOrNull()?.message)
                    }
                    else -> promise.reject("UNSUPPORTED_TYPE", "Unsupported printer type: $connectionType")
                }
            } catch (e: Exception) {
                promise.reject("PRINT_EXCEPTION", e.message, e)
            }
        }
    }

    @ReactMethod
    fun testPrint(
        connectionType: String,
        target: String,
        port: Int,
        paperSize: String,
        hotelName: String,
        promise: Promise
    ) {
        scope.launch {
            try {
                val hName = if (hotelName.isNotEmpty()) hotelName else "AJALKAR HOTEL & POS"
                val pSize = if (paperSize.isNotEmpty()) paperSize else "80mm"
                val bytes = EscPosHelper.generateTestSlip(hName, pSize, connectionType)

                when (connectionType.uppercase()) {
                    "BLUETOOTH" -> {
                        if (!btManager.isPrinterConnected() && target.isNotEmpty()) {
                            val connRes = btManager.connect(target)
                            if (connRes.isFailure) {
                                promise.reject("TEST_ERROR", "Failed to connect to Bluetooth printer: ${connRes.exceptionOrNull()?.message}")
                                return@launch
                            }
                        }
                        val res = btManager.printBytes(bytes)
                        if (res.isSuccess) promise.resolve(true)
                        else promise.reject("TEST_ERROR", res.exceptionOrNull()?.message)
                    }
                    "USB" -> {
                        val deviceId = target.toIntOrNull() ?: 0
                        if (!usbManager.isPrinterConnected() && deviceId > 0) {
                            val connRes = usbManager.connect(deviceId)
                            if (connRes.isFailure) {
                                promise.reject("TEST_ERROR", "Failed to connect to USB printer: ${connRes.exceptionOrNull()?.message}")
                                return@launch
                            }
                        }
                        val res = usbManager.printBytes(bytes)
                        if (res.isSuccess) promise.resolve(true)
                        else promise.reject("TEST_ERROR", res.exceptionOrNull()?.message)
                    }
                    "NETWORK" -> {
                        val actualPort = if (port > 0) port else 9100
                        val res = netManager.printBytes(target, actualPort, bytes)
                        if (res.isSuccess) promise.resolve(true)
                        else promise.reject("TEST_ERROR", res.exceptionOrNull()?.message)
                    }
                    else -> promise.reject("UNSUPPORTED_TYPE", "Unsupported connection type: $connectionType")
                }
            } catch (e: Exception) {
                promise.reject("TEST_EXCEPTION", e.message, e)
            }
        }
    }

    @ReactMethod
    fun openAndroidPrintSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_PRINT_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }
}

