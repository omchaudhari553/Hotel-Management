package com.hotelmanagement.printer

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

class NetworkPrinterManager {

    companion object {
        private var instance: NetworkPrinterManager? = null

        fun getInstance(): NetworkPrinterManager {
            if (instance == null) {
                instance = NetworkPrinterManager()
            }
            return instance!!
        }
    }

    suspend fun checkPrinterOnline(ipAddress: String, port: Int = 9100, timeoutMs: Int = 2500): Boolean = withContext(Dispatchers.IO) {
        try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ipAddress, port), timeoutMs)
                return@withContext true
            }
        } catch (_: Exception) {
            return@withContext false
        }
    }

    suspend fun printBytes(ipAddress: String, port: Int = 9100, bytes: ByteArray, timeoutMs: Int = 4000): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ipAddress, port), timeoutMs)
                socket.soTimeout = timeoutMs
                val out = socket.getOutputStream()
                out.write(bytes)
                out.flush()
                // Small sleep to ensure printer buffer processes before socket closure
                Thread.sleep(150)
                return@withContext Result.success(true)
            }
        } catch (e: Exception) {
            return@withContext Result.failure(Exception("Failed to send print job to network printer $ipAddress:$port: ${e.message}"))
        }
    }
}

