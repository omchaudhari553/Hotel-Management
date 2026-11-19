package com.hotelmanagement.printer

import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

object EscPosHelper {

    // ESC/POS Commands
    val ESC: Byte = 0x1B
    val FS: Byte = 0x1C
    val GS: Byte = 0x1D

    // Initialization
    val INIT = byteArrayOf(ESC, 0x40)

    // Alignment
    val ALIGN_LEFT = byteArrayOf(ESC, 0x61, 0x00)
    val ALIGN_CENTER = byteArrayOf(ESC, 0x61, 0x01)
    val ALIGN_RIGHT = byteArrayOf(ESC, 0x61, 0x02)

    // Text Formatting
    val BOLD_ON = byteArrayOf(ESC, 0x45, 0x01)
    val BOLD_OFF = byteArrayOf(ESC, 0x45, 0x00)

    // Text Size (GS ! n)
    val SIZE_NORMAL = byteArrayOf(GS, 0x21, 0x00)
    val SIZE_DOUBLE_HEIGHT = byteArrayOf(GS, 0x21, 0x01)
    val SIZE_DOUBLE_WIDTH = byteArrayOf(GS, 0x21, 0x10)
    val SIZE_DOUBLE = byteArrayOf(GS, 0x21, 0x11)

    // Paper Cut
    val PARTIAL_CUT = byteArrayOf(GS, 0x56, 0x42, 0x00) // GS V B 0 (feed and cut)
    val FULL_CUT = byteArrayOf(GS, 0x56, 0x41, 0x00)

    // Cash Drawer Kick
    val KICK_DRAWER = byteArrayOf(ESC, 0x70, 0x00, 0x19, 0xFA.toByte())

    // Line Feed
    val LF = byteArrayOf(0x0A)
    val CR = byteArrayOf(0x0D)

    fun getLineWidth(paperSize: String): Int {
        return if (paperSize.contains("58", ignoreCase = true)) 32 else 48
    }

    fun makeDivider(paperSize: String, char: Char = '-'): String {
        val width = getLineWidth(paperSize)
        return char.toString().repeat(width)
    }

    fun formatTwoColumns(left: String, right: String, paperSize: String): String {
        val width = getLineWidth(paperSize)
        val l = left.trim()
        val r = right.trim()
        val spaceNeeded = width - l.length - r.length
        return if (spaceNeeded > 0) {
            l + " ".repeat(spaceNeeded) + r
        } else {
            // Squeeze if too long
            val maxLeft = (width - r.length - 1).coerceAtLeast(1)
            val trimmedLeft = if (l.length > maxLeft) l.substring(0, maxLeft) else l
            val spaces = (width - trimmedLeft.length - r.length).coerceAtLeast(1)
            trimmedLeft + " ".repeat(spaces) + r
        }
    }

    fun generateTestSlip(hotelName: String, paperSize: String, connectionType: String): ByteArray {
        val out = ByteArrayOutputStream()
        val cs = Charset.forName("CP437")

        out.write(INIT)
        out.write(ALIGN_CENTER)
        out.write(SIZE_DOUBLE)
        out.write(BOLD_ON)
        out.write("$hotelName\n".toByteArray(cs))

        out.write(SIZE_NORMAL)
        out.write(BOLD_OFF)
        out.write("HOTEL PRINTER MANAGEMENT SYSTEM\n".toByteArray(cs))
        out.write("Direct Native ESC/POS Driver\n".toByteArray(cs))

        out.write(ALIGN_LEFT)
        out.write("${makeDivider(paperSize, '=')}\n".toByteArray(cs))
        out.write(formatTwoColumns("Connection:", connectionType.uppercase(), paperSize).toByteArray(cs))
        out.write("\n".toByteArray(cs))
        out.write(formatTwoColumns("Paper Size:", paperSize.uppercase(), paperSize).toByteArray(cs))
        out.write("\n".toByteArray(cs))
        out.write(formatTwoColumns("Character Set:", "PC437 / Standard", paperSize).toByteArray(cs))
        out.write("\n".toByteArray(cs))
        out.write(formatTwoColumns("Status:", "ONLINE - READY", paperSize).toByteArray(cs))
        out.write("\n".toByteArray(cs))
        out.write("${makeDivider(paperSize, '-')}\n".toByteArray(cs))

        out.write(ALIGN_CENTER)
        out.write(BOLD_ON)
        out.write("*** PRINTER TEST OK ***\n".toByteArray(cs))
        out.write(BOLD_OFF)
        out.write("Ajalkar Hotel POS & Billing\n".toByteArray(cs))
        out.write("${makeDivider(paperSize, '=')}\n".toByteArray(cs))

        out.write(LF)
        out.write(LF)
        out.write(LF)
        out.write(PARTIAL_CUT)

        return out.toByteArray()
    }
}

