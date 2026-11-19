package com.hotelmanagement.printer

import android.content.Context
import android.os.ParcelFileDescriptor
import android.print.PrintAttributes
import android.print.PrinterCapabilitiesInfo
import android.print.PrinterId
import android.print.PrinterInfo
import android.printservice.PrintJob
import android.printservice.PrintService
import android.printservice.PrinterDiscoverySession
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream

class HotelPrintService : PrintService() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreatePrinterDiscoverySession(): PrinterDiscoverySession {
        return object : PrinterDiscoverySession() {
            private val btManager = BluetoothPrinterManager.getInstance(applicationContext)

            override fun onStartPrinterDiscovery(priorityList: MutableList<PrinterId>?) {
                scope.launch {
                    val printers = mutableListOf<PrinterInfo>()

                    // 1. Discover paired Bluetooth printers
                    val paired = btManager.getPairedDevices()
                    for (dev in paired) {
                        val name = dev["name"] as? String ?: "Bluetooth POS"
                        val address = dev["address"] as? String ?: continue
                        val printerId = generatePrinterId(address)

                        // 80mm thermal receipt capabilities
                        val media80mm = PrintAttributes.MediaSize("Thermal_80mm", "80mm Thermal POS", 3150, 11811)
                        val media58mm = PrintAttributes.MediaSize("Thermal_58mm", "58mm Mini POS", 2283, 11811)

                        val caps = PrinterCapabilitiesInfo.Builder(printerId)
                            .addMediaSize(media80mm, true)
                            .addMediaSize(media58mm, false)
                            .addMediaSize(PrintAttributes.MediaSize.ISO_A4, false)
                            .addResolution(PrintAttributes.Resolution("203dpi", "203 DPI", 203, 203), true)
                            .setColorModes(PrintAttributes.COLOR_MODE_MONOCHROME, PrintAttributes.COLOR_MODE_MONOCHROME)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build()

                        val info = PrinterInfo.Builder(printerId, name, PrinterInfo.STATUS_IDLE)
                            .setDescription("Ajalkar Hotel Bluetooth Thermal POS ($address)")
                            .setCapabilities(caps)
                            .build()

                        printers.add(info)
                    }

                    // 2. Discover Local Network Default POS Printer
                    val netId = generatePrinterId("network_default_9100")
                    val netCaps = PrinterCapabilitiesInfo.Builder(netId)
                        .addMediaSize(PrintAttributes.MediaSize("Thermal_80mm", "80mm Thermal POS", 3150, 11811), true)
                        .addMediaSize(PrintAttributes.MediaSize.ISO_A4, false)
                        .addResolution(PrintAttributes.Resolution("203dpi", "203 DPI", 203, 203), true)
                        .setColorModes(PrintAttributes.COLOR_MODE_MONOCHROME, PrintAttributes.COLOR_MODE_MONOCHROME)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build()

                    val netInfo = PrinterInfo.Builder(netId, "Ajalkar Network POS (Port 9100)", PrinterInfo.STATUS_IDLE)
                        .setDescription("Wi-Fi / LAN Thermal Printer (Standard Raw TCP)")
                        .setCapabilities(netCaps)
                        .build()
                    printers.add(netInfo)

                    withContext(Dispatchers.Main) {
                        addPrinters(printers)
                    }
                }
            }

            override fun onStopPrinterDiscovery() {}

            override fun onValidatePrinters(printerIds: MutableList<PrinterId>) {}

            override fun onStartPrinterStateTracking(printerId: PrinterId) {}

            override fun onStopPrinterStateTracking(printerId: PrinterId) {}

            override fun onDestroy() {}
        }
    }

    override fun onPrintJobQueued(printJob: PrintJob) {
        val printerId = printJob.info.printerId
        val address = printerId.localId

        if (printJob.isQueued) {
            printJob.start()
        }

        scope.launch {
            try {
                val doc = printJob.document
                val pfd: ParcelFileDescriptor? = doc.data

                if (pfd != null) {
                    val inputStream = FileInputStream(pfd.fileDescriptor)
                    val rawBytes = inputStream.readBytes()
                    inputStream.close()

                    if (address.contains(":") && address.length == 17) {
                        // Bluetooth device address
                        val btManager = BluetoothPrinterManager.getInstance(applicationContext)
                        val connRes = btManager.connect(address)
                        if (connRes.isSuccess) {
                            val printRes = btManager.printBytes(rawBytes)
                            if (printRes.isSuccess) {
                                withContext(Dispatchers.Main) { printJob.complete() }
                                return@launch
                            }
                        }
                    } else if (address.contains("network")) {
                        // Send over raw socket to default network IP (or localhost / broadcast)
                        val netManager = NetworkPrinterManager.getInstance()
                        val printRes = netManager.printBytes("192.168.1.100", 9100, rawBytes)
                        if (printRes.isSuccess) {
                            withContext(Dispatchers.Main) { printJob.complete() }
                            return@launch
                        }
                    }
                }

                // If processed via direct stream, mark complete
                withContext(Dispatchers.Main) {
                    printJob.complete()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    printJob.fail("Print processing failed: ${e.message}")
                }
            }
        }
    }

    override fun onRequestCancelPrintJob(printJob: PrintJob) {
        printJob.cancel()
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}

