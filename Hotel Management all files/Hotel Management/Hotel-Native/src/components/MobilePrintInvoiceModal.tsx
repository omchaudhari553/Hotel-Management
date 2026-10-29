import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Printer, Share2, FileText, Check, X, Bluetooth, Smartphone } from 'lucide-react-native';
import { UniversalInvoicePrintData, PaperSize } from '../types/printing';
import { MobilePrintService } from '../services/mobilePrintService';

interface MobilePrintInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  invoiceData: UniversalInvoicePrintData | null;
  onPrinted?: () => void;
}

export const MobilePrintInvoiceModal: React.FC<MobilePrintInvoiceModalProps> = ({
  visible,
  onClose,
  invoiceData,
  onPrinted,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [loading, setLoading] = useState<boolean>(false);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      MobilePrintService.getDefaultPaperSize().then(setPaperSize);
    }
  }, [visible]);

  if (!visible || !invoiceData) return null;

  const handlePrint = async () => {
    try {
      setLoading(true);
      if (saveAsDefault) {
        await MobilePrintService.setDefaultPaperSize(paperSize);
      }
      const res = await MobilePrintService.printInvoice(invoiceData, paperSize);
      if (res.success) {
        if (onPrinted) onPrinted();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Printing Error', err.message || 'Could not dispatch print job.');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setLoading(true);
      await MobilePrintService.exportAndSharePdf(invoiceData, paperSize);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err.message || 'Could not export PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setLoading(true);
      await MobilePrintService.testPrint(paperSize);
    } catch (err: any) {
      Alert.alert('Test Print Error', err.message || 'Test print failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Printer size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Print Invoice #{invoiceData.invoiceNumber}</Text>
                <Text style={styles.headerSubtitle}>Select paper roll size and print destination</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Paper Size Selector */}
            <Text style={styles.sectionLabel}>1. SELECT PAPER FORMAT</Text>
            <View style={styles.paperGrid}>
              {[
                { id: '58mm' as PaperSize, label: '58mm', sub: '2" Pocket Thermal' },
                { id: '80mm' as PaperSize, label: '80mm', sub: '3" Standard POS' },
                { id: 'A4' as PaperSize, label: 'A4', sub: 'Full Sheet Document' },
              ].map((tier) => {
                const isSelected = paperSize === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    onPress={() => setPaperSize(tier.id)}
                    style={[styles.paperCard, isSelected && styles.paperCardActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.paperTitle, isSelected && styles.paperTitleActive]}>
                      {tier.label}
                    </Text>
                    <Text style={[styles.paperDesc, isSelected && styles.paperDescActive]}>
                      {tier.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bluetooth Guidance Info Card */}
            <View style={styles.guidanceBox}>
              <View style={styles.guidanceRow}>
                <Bluetooth size={16} color="#090040" />
                <Text style={styles.guidanceTitle}>Bluetooth Printer Compatibility</Text>
              </View>
              <Text style={styles.guidanceText}>
                • Pair your Bluetooth thermal printer in Android Settings &gt; Bluetooth.
                {'\n'}• Works seamlessly via the Android Print Spooler or standard ESC/POS print services.
                {'\n'}• For A4 invoices, connect to any Wi-Fi/Mopria printer or export as PDF.
              </Text>
            </View>

            {/* Invoice Quick Summary Box */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Table / Room:</Text>
                <Text style={styles.summaryVal}>{invoiceData.tableName || 'Counter'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guest Name:</Text>
                <Text style={styles.summaryVal}>{invoiceData.customerName || 'Walk-in'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items:</Text>
                <Text style={styles.summaryVal}>{invoiceData.items?.length || 0}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryVal}>₹{Number(invoiceData.subtotal || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST Taxes:</Text>
                <Text style={styles.summaryVal}>+ ₹{Number(invoiceData.totalTax || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalVal}>₹{Number(invoiceData.grandTotal || 0).toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryPrintBtn}
                onPress={handlePrint}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Printer size={18} color="#FFFFFF" />
                    <Text style={styles.primaryPrintText}>Print Invoice ({paperSize})</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSharePdf}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Share2 size={16} color="#090040" />
                  <Text style={styles.secondaryBtnText}>Share / Save PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleTestPrint}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Test Print</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 0, 64, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#090040',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#090040',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  paperGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  paperCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  paperCardActive: {
    borderColor: '#090040',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#090040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  paperTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  paperTitleActive: {
    color: '#090040',
  },
  paperDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  paperDescActive: {
    color: '#334155',
  },
  guidanceBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#090040',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#090040',
  },
  guidanceText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#090040',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#090040',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryPrintBtn: {
    backgroundColor: '#090040',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  primaryPrintText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    color: '#090040',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MobilePrintInvoiceModal;

