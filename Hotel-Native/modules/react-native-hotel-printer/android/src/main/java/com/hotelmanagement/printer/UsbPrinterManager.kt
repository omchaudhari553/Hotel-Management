package com.hotelmanagement.printer

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UsbPrinterManager(private val context: Context) {

    companion object {
        private const val ACTION_USB_PERMISSION = "com.hotelmanagement.printer.USB_PERMISSION"
        private var instance: UsbPrinterManager? = null

        fun getInstance(context: Context): UsbPrinterManager {
            if (instance == null) {
                instance = UsbPrinterManager(context.applicationContext)
            }
            return instance!!
        }
    }

    private val usbManager: UsbManager? = context.getSystemService(Context.USB_SERVICE) as? UsbManager
    private var usbDevice: UsbDevice? = null
    private var usbConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var usbEndpointOut: UsbEndpoint? = null
    private var isConnected = false

    fun isPrinterConnected(): Boolean = isConnected && usbConnection != null && usbEndpointOut != null

    fun getConnectedDeviceName(): String? = usbDevice?.productName ?: usbDevice?.deviceName

    fun getConnectedDeviceId(): Int? = usbDevice?.deviceId

    fun getConnectedUsbPrinters(): List<Map<String, Any?>> {
        if (usbManager == null) return emptyList()
        val devices = mutableListOf<Map<String, Any?>>()

        for ((_, device) in usbManager.deviceList) {
            val isPrinter = isUsbPrinterDevice(device)
            devices.add(mapOf(
                "id" to device.deviceId,
                "name" to (device.productName ?: device.deviceName ?: "USB POS Printer"),
                "vendorId" to device.vendorId,
                "productId" to device.productId,
                "type" to "USB",
                "isPrinter" to isPrinter
            ))
        }
        return devices
    }

    private fun isUsbPrinterDevice(device: UsbDevice): Boolean {
        // Class 7 is USB_CLASS_PRINTER
        if (device.deviceClass == UsbConstants.USB_CLASS_PRINTER) return true
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            if (intf.interfaceClass == UsbConstants.USB_CLASS_PRINTER) return true
        }
        return false
    }

    suspend fun connect(deviceId: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        disconnect()
        if (usbManager == null) {
            return@withContext Result.failure(Exception("USB Manager not available on this device"))
        }

        val target = usbManager.deviceList.values.firstOrNull { it.deviceId == deviceId }
            ?: return@withContext Result.failure(Exception("USB Device $deviceId not found"))

        if (!usbManager.hasPermission(target)) {
            val permissionIntent = PendingIntent.getBroadcast(
                context, 0, Intent(ACTION_USB_PERMISSION),
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            usbManager.requestPermission(target, permissionIntent)
            return@withContext Result.failure(Exception("Requesting USB permission for printer. Please grant permission and try again."))
        }

        try {
            val connection = usbManager.openDevice(target)
                ?: return@withContext Result.failure(Exception("Could not open USB connection to printer"))

            // Find bulk transfer OUT endpoint
            var outEndpoint: UsbEndpoint? = null
            var targetIntf: UsbInterface? = null

            for (i in 0 until target.interfaceCount) {
                val intf = target.getInterface(i)
                for (j in 0 until intf.endpointCount) {
                    val ep = intf.getEndpoint(j)
                    if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                        outEndpoint = ep
                        targetIntf = intf
                        break
                    }
                }
                if (outEndpoint != null) break
            }

            if (targetIntf == null || outEndpoint == null) {
                connection.close()
                return@withContext Result.failure(Exception("No compatible bulk OUT print endpoint found on USB device"))
            }

            connection.claimInterface(targetIntf, true)
            usbDevice = target
            usbConnection = connection
            usbInterface = targetIntf
            usbEndpointOut = outEndpoint
            isConnected = true

            return@withContext Result.success(true)
        } catch (e: Exception) {
            disconnect()
            return@withContext Result.failure(e)
        }
    }

    suspend fun printBytes(bytes: ByteArray): Result<Boolean> = withContext(Dispatchers.IO) {
        if (!isPrinterConnected() || usbConnection == null || usbEndpointOut == null) {
            return@withContext Result.failure(Exception("USB Printer is not connected"))
        }

        try {
            // Write in chunks of 4096 bytes if large
            val chunkSize = 4096
            var offset = 0
            while (offset < bytes.size) {
                val length = (bytes.size - offset).coerceAtMost(chunkSize)
                val chunk = bytes.copyOfRange(offset, offset + length)
                val transferred = usbConnection?.bulkTransfer(usbEndpointOut, chunk, chunk.size, 5000) ?: -1
                if (transferred < 0) {
                    return@withContext Result.failure(Exception("USB bulk transfer failed (code: $transferred)"))
                }
                offset += length
            }
            return@withContext Result.success(true)
        } catch (e: Exception) {
            disconnect()
            return@withContext Result.failure(e)
        }
    }

    fun disconnect() {
        isConnected = false
        try {
            if (usbInterface != null && usbConnection != null) {
                usbConnection?.releaseInterface(usbInterface)
            }
            usbConnection?.close()
        } catch (_: Exception) {}
        usbDevice = null
        usbConnection = null
        usbInterface = null
        usbEndpointOut = null
    }
}

