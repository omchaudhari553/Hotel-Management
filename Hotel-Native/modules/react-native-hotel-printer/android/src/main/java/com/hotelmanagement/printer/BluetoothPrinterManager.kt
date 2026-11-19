package com.hotelmanagement.printer

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import kotlinx.coroutines.*
import java.io.OutputStream
import java.util.UUID

@SuppressLint("MissingPermission")
class BluetoothPrinterManager(private val context: Context) {

    companion object {
        // Standard Bluetooth Serial Port Profile (SPP) UUID
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private var instance: BluetoothPrinterManager? = null

        fun getInstance(context: Context): BluetoothPrinterManager {
            if (instance == null) {
                instance = BluetoothPrinterManager(context.applicationContext)
            }
            return instance!!
        }
    }

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var connectedDevice: BluetoothDevice? = null
    private var isConnected = false
    private var autoReconnect = true
    private var reconnectJob: Job? = null

    val isBluetoothAvailable: Boolean
        get() = bluetoothAdapter != null

    val isBluetoothEnabled: Boolean
        get() = bluetoothAdapter?.isEnabled == true

    fun isPrinterConnected(): Boolean = isConnected && socket != null && (socket?.isConnected == true)

    fun getConnectedDeviceName(): String? = connectedDevice?.name

    fun getConnectedDeviceAddress(): String? = connectedDevice?.address

    fun getPairedDevices(): List<Map<String, Any?>> {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            return emptyList()
        }
        val devices = mutableListOf<Map<String, Any?>>()
        val paired = bluetoothAdapter.bondedDevices ?: return emptyList()
        for (d in paired) {
            val isPrinter = isProbablePrinter(d)
            devices.add(mapOf(
                "name" to (d.name ?: "Unknown Device"),
                "address" to d.address,
                "type" to "BLUETOOTH",
                "isBonded" to true,
                "isPrinter" to isPrinter
            ))
        }
        return devices
    }

    private fun isProbablePrinter(device: BluetoothDevice): Boolean {
        val name = (device.name ?: "").lowercase()
        return name.contains("pos") || name.contains("print") || name.contains("mpt") ||
                name.contains("rpp") || name.contains("thermal") || name.contains("tvs") ||
                name.contains("ngx") || name.contains("epson") || name.contains("innerprinter")
    }

    suspend fun connect(macAddress: String): Result<Boolean> = withContext(Dispatchers.IO) {
        disconnect()
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            return@withContext Result.failure(Exception("Bluetooth is disabled or not available"))
        }

        try {
            val device = bluetoothAdapter.getRemoteDevice(macAddress)
            bluetoothAdapter.cancelDiscovery()

            // Try standard RFCOMM socket
            var s: BluetoothSocket? = null
            try {
                s = device.createRfcommSocketToServiceRecord(SPP_UUID)
                s.connect()
            } catch (e: Exception) {
                // Fallback to reflection method for devices with non-standard Bluetooth stacks
                try {
                    val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                    s = m.invoke(device, 1) as BluetoothSocket
                    s.connect()
                } catch (fallbackEx: Exception) {
                    s?.close()
                    return@withContext Result.failure(Exception("Failed to establish Bluetooth connection to $macAddress: ${fallbackEx.message}"))
                }
            }

            socket = s
            outputStream = s.outputStream
            connectedDevice = device
            isConnected = true
            return@withContext Result.success(true)
        } catch (e: Exception) {
            disconnect()
            return@withContext Result.failure(e)
        }
    }

    suspend fun printBytes(bytes: ByteArray): Result<Boolean> = withContext(Dispatchers.IO) {
        if (!isPrinterConnected() || outputStream == null) {
            // Attempt auto-reconnect if device was previously known
            val prevAddress = connectedDevice?.address
            if (autoReconnect && prevAddress != null) {
                val connRes = connect(prevAddress)
                if (connRes.isFailure) {
                    return@withContext Result.failure(Exception("Bluetooth printer is disconnected and auto-reconnect failed."))
                }
            } else {
                return@withContext Result.failure(Exception("Bluetooth printer is not connected."))
            }
        }

        try {
            outputStream?.write(bytes)
            outputStream?.flush()
            return@withContext Result.success(true)
        } catch (e: Exception) {
            disconnect()
            return@withContext Result.failure(e)
        }
    }

    fun disconnect() {
        isConnected = false
        reconnectJob?.cancel()
        reconnectJob = null
        try {
            outputStream?.close()
        } catch (_: Exception) {}
        try {
            socket?.close()
        } catch (_: Exception) {}
        outputStream = null
        socket = null
    }
}

