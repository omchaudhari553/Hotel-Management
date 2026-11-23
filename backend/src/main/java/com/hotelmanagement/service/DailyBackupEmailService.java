package com.hotelmanagement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.UserRole;
import com.hotelmanagement.repository.*;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Transactional(readOnly = true)
public class DailyBackupEmailService {

    private static final Logger log = LoggerFactory.getLogger(DailyBackupEmailService.class);

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final HotelOrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final ExpenseRepository expenseRepository;
    private final HotelTableRepository tableRepository;
    private final MenuItemRepository menuItemRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private JavaMailSender defaultMailSender;

    @Value("${spring.mail.username:omchaudhari553@gmail.com}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String defaultPassword;

    public DailyBackupEmailService(
            BusinessRepository businessRepository,
            UserRepository userRepository,
            HotelOrderRepository orderRepository,
            InvoiceRepository invoiceRepository,
            PaymentRepository paymentRepository,
            ExpenseRepository expenseRepository,
            HotelTableRepository tableRepository,
            MenuItemRepository menuItemRepository,
            HotelSettingRepository hotelSettingRepository) {
        this.businessRepository = businessRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.expenseRepository = expenseRepository;
        this.tableRepository = tableRepository;
        this.menuItemRepository = menuItemRepository;
        this.hotelSettingRepository = hotelSettingRepository;
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    /**
     * Nightly scheduled backup triggered every day at 11:00 PM (23:00 IST).
     * Cron expression: 0 0 23 * * ? (zone = Asia/Kolkata)
     */
    @Scheduled(cron = "0 0 23 * * ?", zone = "Asia/Kolkata")
    public void runNightlyDailyBackup() {
        log.info("=========================================================================");
        log.info(">>> NIGHTLY 11:00 PM SCHEDULED HOTEL BACKUP JOB TRIGGERED <<<");
        log.info("=========================================================================");

        List<Business> businesses = businessRepository.findAll();
        for (Business b : businesses) {
            if (b.isActive()) {
                try {
                    sendBackupEmailForBusiness(b.getId(), null, null, null);
                } catch (Exception ex) {
                    log.error("Failed to execute nightly backup for hotel [{}] (id={}): {}", b.getName(), b.getId(), ex.getMessage(), ex);
                }
            }
        }
    }

    /**
     * Backward-compatible 3-arg overload.
     */
    @Transactional
    public Map<String, Object> sendBackupEmailForBusiness(Long businessId, String customRecipient, String customAppPassword) {
        return sendBackupEmailForBusiness(businessId, customRecipient, customAppPassword, null);
    }

    /**
     * Sends the complete daily business data backup email to the hotel profile email.
     * Can also be triggered manually for instant testing.
     */
    @Transactional
    public Map<String, Object> sendBackupEmailForBusiness(Long businessId, String customRecipient, String customAppPassword, String customSenderEmail) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found with ID: " + businessId));

        String hotelName = (business.getName() != null && !business.getName().isBlank())
                ? business.getName().trim()
                : "Hotel POS";

        // Persist customSenderEmail if passed
        if (customSenderEmail != null && !customSenderEmail.isBlank() && customSenderEmail.contains("@")) {
            saveSetting(business, "SMTP_SENDER_EMAIL", customSenderEmail.trim());
        }

        // Persist customAppPassword if passed
        if (customAppPassword != null && !customAppPassword.isBlank()) {
            saveSetting(business, "SMTP_APP_PASSWORD", customAppPassword.replaceAll("\\s+", "").trim());
        }

        // Determine destination email:
        String targetEmail = customRecipient;
        if (targetEmail == null || targetEmail.isBlank() || !targetEmail.contains("@")) {
            targetEmail = business.getContactEmail();
        }
        if (targetEmail == null || targetEmail.isBlank() || !targetEmail.contains("@")) {
            List<User> users = userRepository.findAllByBusinessId(businessId);
            for (User u : users) {
                if ((u.getRole() == UserRole.OWNER || u.getRole() == UserRole.ADMIN)
                        && u.getEmail() != null && u.getEmail().contains("@")) {
                    targetEmail = u.getEmail().trim();
                    break;
                }
            }
        }
        if (targetEmail == null || targetEmail.isBlank() || !targetEmail.contains("@")) {
            targetEmail = fromEmail;
        }
        targetEmail = targetEmail.trim();

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime now = LocalDateTime.now(istZone);
        String formattedDate = now.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a", Locale.ENGLISH)).toLowerCase();
        formattedDate = formattedDate.substring(0, 11) + formattedDate.substring(11).toUpperCase();
        if (formattedDate.endsWith("AM")) formattedDate = formattedDate.substring(0, formattedDate.length() - 2) + "am";
        if (formattedDate.endsWith("PM")) formattedDate = formattedDate.substring(0, formattedDate.length() - 2) + "pm";

        int randomSuffix = 10000 + new Random().nextInt(90000);
        String refCode = "HTL-" + randomSuffix;

        // 1. Gather Daily Hotel Backup Data
        Map<String, Object> backupData = buildBackupPayload(business, refCode, now);

        // 2. Generate Multi-Sheet Microsoft Excel (.xlsx) Attachment Bytes
        byte[] excelBytes = generateBackupExcel(businessId);

        // 3. Generate Comprehensive Multi-page PDF (.pdf) Attachment Bytes
        byte[] pdfBytes = generateBackupPdf(businessId);

        // 4. Generate JSON Backup Bytes for Server Disk storage
        byte[] jsonBytes;
        try {
            String jsonStr = objectMapper.writeValueAsString(backupData);
            jsonBytes = jsonStr.getBytes(StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.error("Failed to serialize hotel backup data to JSON: {}", ex.getMessage());
            jsonBytes = ("{\"error\":\"Failed to serialize\",\"reference\":\"" + refCode + "\"}").getBytes(StandardCharsets.UTF_8);
        }

        // 5. Always save backups securely on server disk (.xlsx, .pdf, .json)
        try {
            File backupDir = new File("backups");
            if (!backupDir.exists()) backupDir.mkdirs();
            File backupExcelFile = new File(backupDir, "hotel_daily_backup_" + randomSuffix + ".xlsx");
            Files.write(backupExcelFile.toPath(), excelBytes);
            File backupPdfFile = new File(backupDir, "hotel_daily_backup_" + randomSuffix + ".pdf");
            Files.write(backupPdfFile.toPath(), pdfBytes);
            File backupJsonFile = new File(backupDir, "hotel_daily_backup_" + randomSuffix + ".json");
            Files.write(backupJsonFile.toPath(), jsonBytes);
            log.info("Daily backup files safely saved to disk: {}, {}", backupExcelFile.getAbsolutePath(), backupPdfFile.getAbsolutePath());
        } catch (Exception ioEx) {
            log.warn("Could not write backup to local disk: {}", ioEx.getMessage());
        }

        // 6. Build Pixel-Perfect Dark HTML Email branded purely for the Hotel
        String htmlBody = buildBackupEmailHtml(hotelName, formattedDate, refCode, targetEmail);

        // 7. Resolve Active Sender and Password (application.yml takes direct precedence)
        String activeSenderUser = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail.trim() : "omchaudhari553@gmail.com";
        if (customSenderEmail != null && !customSenderEmail.isBlank() && customSenderEmail.contains("@")) {
            activeSenderUser = customSenderEmail.trim();
        }

        String appYmlPassword = (defaultPassword != null) ? defaultPassword.replaceAll("\\s+", "").trim() : "";
        String activePassword = appYmlPassword;
        if (customAppPassword != null && !customAppPassword.isBlank()) {
            activePassword = customAppPassword.replaceAll("\\s+", "").trim();
        } else if (activePassword.isBlank()) {
            Optional<HotelSetting> savedPwd = hotelSettingRepository.findByBusinessIdAndCategoryAndSettingKey(businessId, "EMAIL_BACKUP", "SMTP_APP_PASSWORD");
            if (savedPwd.isPresent() && savedPwd.get().getSettingValue() != null && !savedPwd.get().getSettingValue().isBlank()) {
                activePassword = savedPwd.get().getSettingValue().replaceAll("\\s+", "").trim();
            }
        }

        JavaMailSenderImpl activeMailSender = new JavaMailSenderImpl();
        activeMailSender.setHost("smtp.gmail.com");
        activeMailSender.setPort(587);
        activeMailSender.setUsername(activeSenderUser);
        activeMailSender.setPassword(activePassword != null ? activePassword : "");
        Properties props = activeMailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        // 8. Send Email via JavaMailSender
        boolean emailSent = false;
        String sendError = null;

        try {
            MimeMessage message = activeMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(activeSenderUser, hotelName + " Management");
            helper.setTo(targetEmail);
            helper.setSubject("Daily Business Data Backup - " + hotelName);
            helper.setText(htmlBody, true);

            // Attach Microsoft Excel (.xlsx) workbook with multi-sheet structure
            String excelFileName = "hotel_daily_backup_" + randomSuffix + ".xlsx";
            helper.addAttachment(excelFileName, new ByteArrayResource(excelBytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            // Attach Comprehensive Multi-page PDF (.pdf) operations report
            String pdfFileName = "hotel_daily_backup_" + randomSuffix + ".pdf";
            helper.addAttachment(pdfFileName, new ByteArrayResource(pdfBytes), "application/pdf");

            activeMailSender.send(message);
            emailSent = true;
            log.info(">>> Daily hotel backup email successfully sent to [{}] for hotel [{}] (Ref: {}) <<<", targetEmail, hotelName, refCode);
        } catch (Exception ex) {
            String rawError = ex.getMessage();
            if (rawError != null && (rawError.contains("535") || rawError.toLowerCase().contains("authentication"))) {
                sendError = "Google SMTP 535 Bad Credentials (गुगलने पासवर्ड नाकारला). ईमेल पाठवण्यासाठी कृपया Google Account मधील 16-अंकी App Password (उदा. abcd efgh ijkl mnop) टाका.";
            } else {
                sendError = rawError != null ? rawError : "Failed to dispatch email via SMTP";
            }
            log.error("Failed to send daily hotel backup email via SMTP to {}: {}", targetEmail, sendError, ex);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", emailSent);
        response.put("hotelName", hotelName);
        response.put("recipientEmail", targetEmail);
        response.put("senderEmail", activeSenderUser);
        response.put("reference", refCode);
        response.put("backupDate", formattedDate);
        response.put("status", emailSent ? "SUCCESS" : "SAVED_LOCALLY");
        response.put("excelAttachment", "hotel_daily_backup_" + randomSuffix + ".xlsx");
        response.put("pdfAttachment", "hotel_daily_backup_" + randomSuffix + ".pdf");
        response.put("localBackupSaved", true);
        if (sendError != null) {
            response.put("error", sendError);
        }
        return response;
    }

    /**
     * Builds the structured data payload for the hotel backup.
     */
    public Map<String, Object> buildBackupPayload(Business business, String refCode, LocalDateTime now) {
        Long bizId = business.getId();

        List<HotelOrder> orders = orderRepository.findAllByBusinessId(bizId);
        List<Invoice> invoices = invoiceRepository.findAllByBusinessId(bizId);
        List<Payment> payments = paymentRepository.findAllByBusinessId(bizId);
        List<Expense> expenses = expenseRepository.findAllByBusinessId(bizId);
        List<HotelTable> tables = tableRepository.findAllByBusinessId(bizId);
        List<MenuItem> menuItems = menuItemRepository.findAllByBusinessId(bizId);

        BigDecimal totalSales = BigDecimal.ZERO;
        for (Payment p : payments) {
            if (p.getAmount() != null) {
                totalSales = totalSales.add(p.getAmount());
            }
        }

        BigDecimal totalExpenses = BigDecimal.ZERO;
        for (Expense exp : expenses) {
            if (exp.getAmount() != null) {
                totalExpenses = totalExpenses.add(exp.getAmount());
            }
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("system", business.getName() + " - Hotel POS & Billing Management");
        payload.put("reference", refCode);
        payload.put("backupTimestamp", now.toString());
        payload.put("backupDateFormatted", now.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a")));

        Map<String, Object> hotelInfo = new LinkedHashMap<>();
        hotelInfo.put("id", business.getId());
        hotelInfo.put("hotelName", business.getName());
        hotelInfo.put("code", business.getCode());
        hotelInfo.put("ownerName", business.getOwnerName());
        hotelInfo.put("contactEmail", business.getContactEmail());
        hotelInfo.put("phone", business.getPhone());
        hotelInfo.put("address", business.getAddress());
        hotelInfo.put("city", business.getCity());
        hotelInfo.put("state", business.getState());
        hotelInfo.put("currency", business.getCurrency());
        hotelInfo.put("taxNumber", business.getTaxNumber());
        payload.put("hotel", hotelInfo);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("Total Sales Amount", "₹ " + totalSales);
        summary.put("Total Orders Count", orders.size());
        summary.put("Total Invoices Count", invoices.size());
        summary.put("Total Payments Recorded", payments.size());
        summary.put("Total Expenses", "₹ " + totalExpenses);
        summary.put("Total Tables Registered", tables.size());
        summary.put("Total Menu Items Active", menuItems.size());
        payload.put("summary", summary);

        // Map tables cleanly
        List<Map<String, Object>> tableList = new ArrayList<>();
        for (HotelTable t : tables) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("status", t.getStatus() != null ? t.getStatus().name() : "AVAILABLE");
            m.put("capacity", t.getCapacity());
            m.put("area", t.getArea());
            tableList.add(m);
        }
        payload.put("tables", tableList);

        // Map menu items cleanly
        List<Map<String, Object>> menuList = new ArrayList<>();
        for (MenuItem mi : menuItems) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", mi.getId());
            m.put("name", mi.getName());
            m.put("category", mi.getCategory());
            m.put("price", mi.getPrice());
            m.put("active", mi.isActive());
            menuList.add(m);
        }
        payload.put("menuItems", menuList);

        // Map invoices cleanly without proxy lazy exception
        List<Map<String, Object>> invList = new ArrayList<>();
        for (Invoice inv : invoices) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", inv.getId());
            m.put("invoiceNumber", inv.getInvoiceNumber());
            String customer = "";
            try {
                if (inv.getOrder() != null) {
                    customer = inv.getOrder().getGuestName();
                }
            } catch (Exception ignored) {
            }
            m.put("customerName", customer != null ? customer : "");
            m.put("grandTotal", inv.getGrandTotal());
            m.put("invoiceDate", inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "");
            m.put("status", inv.getStatus() != null ? inv.getStatus().name() : "");
            invList.add(m);
        }
        payload.put("invoices", invList);

        // Map payments cleanly
        List<Map<String, Object>> payList = new ArrayList<>();
        for (Payment p : payments) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("amount", p.getAmount());
            m.put("paymentMethod", p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "");
            m.put("paymentDate", p.getPaymentDate() != null ? p.getPaymentDate().toString() : "");
            m.put("transactionRef", p.getTransactionRef());
            m.put("status", p.getStatus() != null ? p.getStatus().name() : "");
            payList.add(m);
        }
        payload.put("payments", payList);

        // Map expenses cleanly
        List<Map<String, Object>> expList = new ArrayList<>();
        for (Expense exp : expenses) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", exp.getId());
            m.put("name", exp.getName());
            m.put("category", exp.getCategory());
            m.put("amount", exp.getAmount());
            m.put("expenseDate", exp.getExpenseDate() != null ? exp.getExpenseDate().toString() : "");
            m.put("paymentMode", exp.getPaymentMode());
            expList.add(m);
        }
        payload.put("expenses", expList);

        return payload;
    }

    /**
     * Generates raw formatted JSON backup bytes for downloading.
     */
    @Transactional(readOnly = true)
    public byte[] generateBackupJson(Long businessId) {
        Business b = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));
        int randomSuffix = 10000 + new Random().nextInt(90000);
        String refCode = "HTL-" + randomSuffix;
        Map<String, Object> data = buildBackupPayload(b, refCode, LocalDateTime.now(ZoneId.of("Asia/Kolkata")));
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            return "{}".getBytes(StandardCharsets.UTF_8);
        }
    }

    /**
     * Generates a fully compliant Microsoft Excel (.xlsx) workbook with multiple sheets
     * using pure Java OpenXML packaging (no external third-party POI dependency required).
     */
    @Transactional(readOnly = true)
    public byte[] generateBackupExcel(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found with ID: " + businessId));

        List<HotelOrder> orders = orderRepository.findAllByBusinessId(businessId);
        List<Invoice> invoices = invoiceRepository.findAllByBusinessId(businessId);
        List<Payment> payments = paymentRepository.findAllByBusinessId(businessId);
        List<Expense> expenses = expenseRepository.findAllByBusinessId(businessId);
        List<HotelTable> tables = tableRepository.findAllByBusinessId(businessId);
        List<MenuItem> menuItems = menuItemRepository.findAllByBusinessId(businessId);

        BigDecimal totalSales = BigDecimal.ZERO;
        for (Payment p : payments) {
            if (p.getAmount() != null) totalSales = totalSales.add(p.getAmount());
        }
        BigDecimal totalExpenses = BigDecimal.ZERO;
        for (Expense exp : expenses) {
            if (exp.getAmount() != null) totalExpenses = totalExpenses.add(exp.getAmount());
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime now = LocalDateTime.now(istZone);
        String formattedDate = now.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a", Locale.ENGLISH));
        int randomSuffix = 10000 + new Random().nextInt(90000);
        String refCode = "HTL-" + randomSuffix;

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            // 1. [Content_Types].xml
            zos.putNextEntry(new ZipEntry("[Content_Types].xml"));
            zos.write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet6.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/worksheets/sheet7.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                </Types>
                """.trim().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 2. _rels/.rels
            zos.putNextEntry(new ZipEntry("_rels/.rels"));
            zos.write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                </Relationships>
                """.trim().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 3. xl/_rels/workbook.xml.rels
            zos.putNextEntry(new ZipEntry("xl/_rels/workbook.xml.rels"));
            zos.write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
                  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
                  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
                  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>
                  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet6.xml"/>
                  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet7.xml"/>
                  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                </Relationships>
                """.trim().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 4. xl/workbook.xml
            zos.putNextEntry(new ZipEntry("xl/workbook.xml"));
            zos.write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <sheets>
                    <sheet name="Summary &amp; Info" sheetId="1" r:id="rId1"/>
                    <sheet name="Invoices" sheetId="2" r:id="rId2"/>
                    <sheet name="Orders" sheetId="3" r:id="rId3"/>
                    <sheet name="Payments" sheetId="4" r:id="rId4"/>
                    <sheet name="Expenses" sheetId="5" r:id="rId5"/>
                    <sheet name="Dining Tables" sheetId="6" r:id="rId6"/>
                    <sheet name="Menu Catalog" sheetId="7" r:id="rId7"/>
                  </sheets>
                </workbook>
                """.trim().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 5. xl/styles.xml
            zos.putNextEntry(new ZipEntry("xl/styles.xml"));
            zos.write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <fonts count="4">
                    <font><sz val="11"/><name val="Segoe UI"/></font>
                    <font><b/><sz val="11"/><name val="Segoe UI"/></font>
                    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
                    <font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Segoe UI"/></font>
                  </fonts>
                  <fills count="4">
                    <fill><patternFill patternType="none"/></fill>
                    <fill><patternFill patternType="gray125"/></fill>
                    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
                    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
                  </fills>
                  <borders count="2">
                    <border><left/><right/><top/><bottom/><diagonal/></border>
                    <border>
                      <left style="thin"><color rgb="FFCBD5E1"/></left>
                      <right style="thin"><color rgb="FFCBD5E1"/></right>
                      <top style="thin"><color rgb="FFCBD5E1"/></top>
                      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
                      <diagonal/>
                    </border>
                  </borders>
                  <cellStyleXfs count="1">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
                  </cellStyleXfs>
                  <cellXfs count="5">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
                    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0"/>
                    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
                    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
                    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
                  </cellXfs>
                </styleSheet>
                """.trim().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 6. Sheet 1: Summary & Info
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet1.xml"));
            StringBuilder s1 = new StringBuilder();
            s1.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s1.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s1.append("<cols><col min=\"1\" max=\"1\" width=\"28\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"40\" customWidth=\"1\"/></cols>\n");
            s1.append("<sheetData>\n");
            int r1 = 1;
            writeXmlRow(s1, r1++, new String[]{"s"}, new Object[]{business.getName() + " - Daily Operations Data Backup"}, new int[]{3});
            writeXmlRow(s1, r1++, new String[]{"s"}, new Object[]{"Backup Reference: " + refCode + " | Generated At: " + formattedDate}, new int[]{1});
            r1++; // blank
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"PROPERTY / HOTEL DETAILS", ""}, new int[]{2, 2});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Hotel / Business Name", business.getName()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Business Code", business.getCode()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Owner / Administrator", business.getOwnerName()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Contact Email", business.getContactEmail()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Phone / Mobile", business.getPhone()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Address", business.getAddress()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"City & State", (business.getCity() != null ? business.getCity() : "") + (business.getState() != null ? ", " + business.getState() : "")}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"Tax / GST Number", business.getTaxNumber()}, new int[]{1, 0});
            r1++; // blank
            writeXmlRow(s1, r1++, new String[]{"s", "s"}, new Object[]{"OPERATIONS & FINANCIAL SUMMARY", ""}, new int[]{2, 2});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Sales Amount (Payments)", totalSales}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Operating Expenses", totalExpenses}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Net Balance / Margin", totalSales.subtract(totalExpenses)}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Invoices Issued", invoices.size()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Guest Orders", orders.size()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Payments Recorded", payments.size()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Dining Tables", tables.size()}, new int[]{1, 0});
            writeXmlRow(s1, r1++, new String[]{"s", "n"}, new Object[]{"Total Active Menu Items", menuItems.size()}, new int[]{1, 0});
            s1.append("</sheetData>\n</worksheet>");
            zos.write(s1.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 7. Sheet 2: Invoices
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet2.xml"));
            StringBuilder s2 = new StringBuilder();
            s2.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s2.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s2.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"20\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"28\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"16\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"16\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"16\" customWidth=\"1\"/><col min=\"7\" max=\"7\" width=\"18\" customWidth=\"1\"/><col min=\"8\" max=\"8\" width=\"16\" customWidth=\"1\"/><col min=\"9\" max=\"9\" width=\"16\" customWidth=\"1\"/></cols>\n");
            s2.append("<sheetData>\n");
            String[] invHeaders = {"Invoice ID", "Invoice Number", "Customer / Guest", "Grand Total", "Paid Amount", "Due Amount", "Payment Method", "Invoice Date", "Status"};
            int[] invHStyles = {2, 2, 2, 2, 2, 2, 2, 2, 2};
            writeXmlRow(s2, 1, new String[]{"s", "s", "s", "s", "s", "s", "s", "s", "s"}, invHeaders, invHStyles);
            int r2 = 2;
            for (Invoice inv : invoices) {
                String cust = "";
                try {
                    if (inv.getOrder() != null && inv.getOrder().getGuestName() != null) {
                        cust = inv.getOrder().getGuestName();
                    }
                } catch (Exception ignored) {}
                Object[] vals = {
                    inv.getId(),
                    inv.getInvoiceNumber(),
                    cust,
                    inv.getGrandTotal() != null ? inv.getGrandTotal() : BigDecimal.ZERO,
                    inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO,
                    inv.getDueAmount() != null ? inv.getDueAmount() : BigDecimal.ZERO,
                    inv.getPaymentMethod() != null ? inv.getPaymentMethod() : "",
                    inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "",
                    inv.getStatus() != null ? inv.getStatus().name() : ""
                };
                writeXmlRow(s2, r2++, new String[]{"n", "s", "s", "n", "n", "n", "s", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0, 0, 0, 0});
            }
            s2.append("</sheetData>\n</worksheet>");
            zos.write(s2.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 8. Sheet 3: Orders
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet3.xml"));
            StringBuilder s3 = new StringBuilder();
            s3.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s3.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s3.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"20\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"25\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"14\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"16\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"16\" customWidth=\"1\"/><col min=\"7\" max=\"7\" width=\"14\" customWidth=\"1\"/><col min=\"8\" max=\"8\" width=\"14\" customWidth=\"1\"/><col min=\"9\" max=\"9\" width=\"16\" customWidth=\"1\"/><col min=\"10\" max=\"10\" width=\"16\" customWidth=\"1\"/><col min=\"11\" max=\"11\" width=\"22\" customWidth=\"1\"/><col min=\"12\" max=\"12\" width=\"16\" customWidth=\"1\"/></cols>\n");
            s3.append("<sheetData>\n");
            String[] ordHeaders = {"Order ID", "Order Number", "Guest Name", "Guests", "Source", "Table", "Discount", "Tax Rate", "Total Amount", "Sent Kitchen", "Created Date", "Status"};
            int[] ordHStyles = {2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2};
            writeXmlRow(s3, 1, new String[]{"s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s", "s"}, ordHeaders, ordHStyles);
            int r3 = 2;
            for (HotelOrder ord : orders) {
                String tableName = "";
                try {
                    if (ord.getTable() != null && ord.getTable().getName() != null) {
                        tableName = ord.getTable().getName();
                    }
                } catch (Exception ignored) {}
                Object[] vals = {
                    ord.getId(),
                    ord.getOrderNumber(),
                    ord.getGuestName() != null ? ord.getGuestName() : "",
                    ord.getGuestCount() != null ? ord.getGuestCount() : 1,
                    ord.getOrderSource() != null ? ord.getOrderSource() : "INTERNAL",
                    tableName,
                    ord.getDiscount() != null ? ord.getDiscount() : BigDecimal.ZERO,
                    ord.getTaxRate() != null ? ord.getTaxRate() : BigDecimal.ZERO,
                    ord.getTotalAmount() != null ? ord.getTotalAmount() : BigDecimal.ZERO,
                    ord.isSentToKitchen() ? "YES" : "NO",
                    ord.getCreatedAt() != null ? ord.getCreatedAt().toString() : "",
                    ord.getStatus() != null ? ord.getStatus().name() : ""
                };
                writeXmlRow(s3, r3++, new String[]{"n", "s", "s", "n", "s", "s", "n", "n", "n", "s", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0});
            }
            s3.append("</sheetData>\n</worksheet>");
            zos.write(s3.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 9. Sheet 4: Payments
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet4.xml"));
            StringBuilder s4 = new StringBuilder();
            s4.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s4.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s4.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"25\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"16\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"18\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"16\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"16\" customWidth=\"1\"/><col min=\"7\" max=\"7\" width=\"28\" customWidth=\"1\"/></cols>\n");
            s4.append("<sheetData>\n");
            String[] payHeaders = {"Payment ID", "Transaction Reference", "Amount", "Payment Method", "Payment Date", "Status", "Notes"};
            int[] payHStyles = {2, 2, 2, 2, 2, 2, 2};
            writeXmlRow(s4, 1, new String[]{"s", "s", "s", "s", "s", "s", "s"}, payHeaders, payHStyles);
            int r4 = 2;
            for (Payment p : payments) {
                Object[] vals = {
                    p.getId(),
                    p.getTransactionRef() != null ? p.getTransactionRef() : "",
                    p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO,
                    p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "",
                    p.getPaymentDate() != null ? p.getPaymentDate().toString() : "",
                    p.getStatus() != null ? p.getStatus().name() : "",
                    p.getNotes() != null ? p.getNotes() : ""
                };
                writeXmlRow(s4, r4++, new String[]{"n", "s", "n", "s", "s", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0, 0});
            }
            s4.append("</sheetData>\n</worksheet>");
            zos.write(s4.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 10. Sheet 5: Expenses
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet5.xml"));
            StringBuilder s5 = new StringBuilder();
            s5.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s5.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s5.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"28\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"20\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"16\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"18\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"16\" customWidth=\"1\"/><col min=\"7\" max=\"7\" width=\"30\" customWidth=\"1\"/></cols>\n");
            s5.append("<sheetData>\n");
            String[] expHeaders = {"Expense ID", "Expense Name", "Category", "Amount", "Payment Mode", "Expense Date", "Description"};
            int[] expHStyles = {2, 2, 2, 2, 2, 2, 2};
            writeXmlRow(s5, 1, new String[]{"s", "s", "s", "s", "s", "s", "s"}, expHeaders, expHStyles);
            int r5 = 2;
            for (Expense exp : expenses) {
                Object[] vals = {
                    exp.getId(),
                    exp.getName() != null ? exp.getName() : "",
                    exp.getCategory() != null ? exp.getCategory() : "",
                    exp.getAmount() != null ? exp.getAmount() : BigDecimal.ZERO,
                    exp.getPaymentMode() != null ? exp.getPaymentMode() : "",
                    exp.getExpenseDate() != null ? exp.getExpenseDate().toString() : "",
                    exp.getDescription() != null ? exp.getDescription() : ""
                };
                writeXmlRow(s5, r5++, new String[]{"n", "s", "s", "n", "s", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0, 0});
            }
            s5.append("</sheetData>\n</worksheet>");
            zos.write(s5.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 11. Sheet 6: Dining Tables
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet6.xml"));
            StringBuilder s6 = new StringBuilder();
            s6.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s6.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s6.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"22\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"22\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"16\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"18\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"30\" customWidth=\"1\"/></cols>\n");
            s6.append("<sheetData>\n");
            String[] tblHeaders = {"Table ID", "Table Name", "Area / Section", "Capacity (Seats)", "Status", "Notes"};
            int[] tblHStyles = {2, 2, 2, 2, 2, 2};
            writeXmlRow(s6, 1, new String[]{"s", "s", "s", "s", "s", "s"}, tblHeaders, tblHStyles);
            int r6 = 2;
            for (HotelTable tbl : tables) {
                Object[] vals = {
                    tbl.getId(),
                    tbl.getName() != null ? tbl.getName() : "",
                    tbl.getArea() != null ? tbl.getArea() : "",
                    tbl.getCapacity() != null ? tbl.getCapacity() : 0,
                    tbl.getStatus() != null ? tbl.getStatus().name() : "",
                    tbl.getNote() != null ? tbl.getNote() : ""
                };
                writeXmlRow(s6, r6++, new String[]{"n", "s", "s", "n", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0});
            }
            s6.append("</sheetData>\n</worksheet>");
            zos.write(s6.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 12. Sheet 7: Menu Catalog
            zos.putNextEntry(new ZipEntry("xl/worksheets/sheet7.xml"));
            StringBuilder s7 = new StringBuilder();
            s7.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
            s7.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
            s7.append("<cols><col min=\"1\" max=\"1\" width=\"12\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"30\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"22\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"16\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"16\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"35\" customWidth=\"1\"/></cols>\n");
            s7.append("<sheetData>\n");
            String[] miHeaders = {"Item ID", "Item Name", "Category", "Price", "Status", "Description"};
            int[] miHStyles = {2, 2, 2, 2, 2, 2};
            writeXmlRow(s7, 1, new String[]{"s", "s", "s", "s", "s", "s"}, miHeaders, miHStyles);
            int r7 = 2;
            for (MenuItem mi : menuItems) {
                Object[] vals = {
                    mi.getId(),
                    mi.getName() != null ? mi.getName() : "",
                    mi.getCategory() != null ? mi.getCategory() : "",
                    mi.getPrice() != null ? mi.getPrice() : BigDecimal.ZERO,
                    mi.isActive() ? "ACTIVE" : "INACTIVE",
                    mi.getDescription() != null ? mi.getDescription() : ""
                };
                writeXmlRow(s7, r7++, new String[]{"n", "s", "s", "n", "s", "s"}, vals, new int[]{0, 0, 0, 0, 0, 0});
            }
            s7.append("</sheetData>\n</worksheet>");
            zos.write(s7.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            zos.close();
            return baos.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to generate multi-sheet Excel backup workbook: {}", ex.getMessage(), ex);
            return new byte[0];
        }
    }

    private static void writeXmlRow(StringBuilder sb, int rowNum, String[] cellTypes, Object[] cellValues, int[] styles) {
        sb.append("<row r=\"").append(rowNum).append("\">");
        for (int col = 0; col < cellValues.length; col++) {
            Object val = cellValues[col];
            if (val == null) continue;
            String colRef = getColRef(col + 1) + rowNum;
            int style = (styles != null && col < styles.length) ? styles[col] : 0;
            String type = (cellTypes != null && col < cellTypes.length) ? cellTypes[col] : "s";
            if ("n".equals(type) && val instanceof Number) {
                sb.append("<c r=\"").append(colRef).append("\" t=\"n\" s=\"").append(style).append("\"><v>")
                  .append(val).append("</v></c>");
            } else {
                sb.append("<c r=\"").append(colRef).append("\" t=\"inlineStr\" s=\"").append(style).append("\"><is><t>")
                  .append(escapeXml(String.valueOf(val))).append("</t></is></c>");
            }
        }
        sb.append("</row>\n");
    }

    private static String getColRef(int colNum) {
        StringBuilder sb = new StringBuilder();
        while (colNum > 0) {
            int rem = (colNum - 1) % 26;
            sb.insert(0, (char) ('A' + rem));
            colNum = (colNum - 1) / 26;
        }
        return sb.toString();
    }

    private static String escapeXml(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&apos;");
                default -> {
                    if (c >= 0x20 || c == '\t' || c == '\n' || c == '\r') {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    /**
     * Generates a comprehensive, multi-page PDF operations report
     * containing complete tables for Invoices, Orders, Payments, Expenses, Tables, and Menu.
     */
    @Transactional(readOnly = true)
    public byte[] generateBackupPdf(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found with ID: " + businessId));

        String hotelName = (business.getName() != null && !business.getName().isBlank())
                ? business.getName().trim()
                : "Hotel POS";

        List<HotelOrder> orders = orderRepository.findAllByBusinessId(businessId);
        List<Invoice> invoices = invoiceRepository.findAllByBusinessId(businessId);
        List<Payment> payments = paymentRepository.findAllByBusinessId(businessId);
        List<Expense> expenses = expenseRepository.findAllByBusinessId(businessId);
        List<HotelTable> tables = tableRepository.findAllByBusinessId(businessId);
        List<MenuItem> menuItems = menuItemRepository.findAllByBusinessId(businessId);

        BigDecimal totalSales = BigDecimal.ZERO;
        for (Payment p : payments) {
            if (p.getAmount() != null) totalSales = totalSales.add(p.getAmount());
        }
        BigDecimal totalExpenses = BigDecimal.ZERO;
        for (Expense exp : expenses) {
            if (exp.getAmount() != null) totalExpenses = totalExpenses.add(exp.getAmount());
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime now = LocalDateTime.now(istZone);
        String formattedDate = now.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a", Locale.ENGLISH));
        int randomSuffix = 10000 + new Random().nextInt(90000);
        String refCode = "HTL-" + randomSuffix;

        PdfDocumentBuilder doc = new PdfDocumentBuilder(hotelName, refCode, formattedDate);

        // Page 1: Overview Summary Cards
        doc.drawExecutiveSummary(business, totalSales, totalExpenses, invoices.size(), orders.size(), payments.size(), tables.size(), menuItems.size());

        // 1. Invoices Table
        doc.drawSectionTitle("1. RECENT INVOICES & SALES", "All recorded customer invoices (" + invoices.size() + ")");
        float[] invWidths = {85, 115, 75, 75, 85, 80};
        doc.drawTableHeader(new String[]{"Invoice #", "Customer", "Total", "Paid", "Date", "Status"}, invWidths);
        int invIdx = 0;
        for (Invoice inv : invoices) {
            String cust = "";
            try {
                if (inv.getOrder() != null && inv.getOrder().getGuestName() != null) {
                    cust = inv.getOrder().getGuestName();
                }
            } catch (Exception ignored) {}
            String[] row = {
                inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "-",
                cust,
                "Rs. " + (inv.getGrandTotal() != null ? inv.getGrandTotal() : 0),
                "Rs. " + (inv.getPaidAmount() != null ? inv.getPaidAmount() : 0),
                inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "-",
                inv.getStatus() != null ? inv.getStatus().name() : "-"
            };
            doc.drawTableRow(row, invWidths, (invIdx++ % 2 == 1));
        }

        // 2. Orders Table
        doc.drawSectionTitle("2. GUEST ORDERS & KOT", "All recorded guest dining orders (" + orders.size() + ")");
        float[] ordWidths = {85, 120, 65, 65, 90, 90};
        doc.drawTableHeader(new String[]{"Order #", "Guest Name", "Table", "Source", "Amount", "Status"}, ordWidths);
        int ordIdx = 0;
        for (HotelOrder ord : orders) {
            String tblName = "";
            try {
                if (ord.getTable() != null && ord.getTable().getName() != null) {
                    tblName = ord.getTable().getName();
                }
            } catch (Exception ignored) {}
            String[] row = {
                ord.getOrderNumber() != null ? ord.getOrderNumber() : "-",
                ord.getGuestName() != null ? ord.getGuestName() : "-",
                tblName,
                ord.getOrderSource() != null ? ord.getOrderSource() : "INTERNAL",
                "Rs. " + (ord.getTotalAmount() != null ? ord.getTotalAmount() : 0),
                ord.getStatus() != null ? ord.getStatus().name() : "-"
            };
            doc.drawTableRow(row, ordWidths, (ordIdx++ % 2 == 1));
        }

        // 3. Payments Table
        doc.drawSectionTitle("3. PAYMENTS & TRANSACTIONS", "Total transactions recorded (" + payments.size() + ")");
        float[] payWidths = {110, 75, 85, 85, 70, 90};
        doc.drawTableHeader(new String[]{"Txn Ref", "Method", "Amount", "Date", "Status", "Notes"}, payWidths);
        int payIdx = 0;
        for (Payment p : payments) {
            String[] row = {
                p.getTransactionRef() != null ? p.getTransactionRef() : "-",
                p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "-",
                "Rs. " + (p.getAmount() != null ? p.getAmount() : 0),
                p.getPaymentDate() != null ? p.getPaymentDate().toString() : "-",
                p.getStatus() != null ? p.getStatus().name() : "-",
                p.getNotes() != null ? p.getNotes() : ""
            };
            doc.drawTableRow(row, payWidths, (payIdx++ % 2 == 1));
        }

        // 4. Operating Expenses
        doc.drawSectionTitle("4. OPERATING EXPENSES", "Total recorded expense vouchers (" + expenses.size() + ")");
        float[] expWidths = {125, 95, 85, 85, 125};
        doc.drawTableHeader(new String[]{"Expense Name", "Category", "Amount", "Mode", "Date"}, expWidths);
        int expIdx = 0;
        for (Expense exp : expenses) {
            String[] row = {
                exp.getName() != null ? exp.getName() : "-",
                exp.getCategory() != null ? exp.getCategory() : "-",
                "Rs. " + (exp.getAmount() != null ? exp.getAmount() : 0),
                exp.getPaymentMode() != null ? exp.getPaymentMode() : "-",
                exp.getExpenseDate() != null ? exp.getExpenseDate().toString() : "-"
            };
            doc.drawTableRow(row, expWidths, (expIdx++ % 2 == 1));
        }

        // 5. Dining Tables
        doc.drawSectionTitle("5. DINING TABLES & SEATING", "All registered floor dining tables (" + tables.size() + ")");
        float[] tblWidths = {110, 115, 60, 100, 130};
        doc.drawTableHeader(new String[]{"Table Name", "Area / Section", "Seats", "Status", "Notes"}, tblWidths);
        int tblIdx = 0;
        for (HotelTable tbl : tables) {
            String[] row = {
                tbl.getName() != null ? tbl.getName() : "-",
                tbl.getArea() != null ? tbl.getArea() : "-",
                String.valueOf(tbl.getCapacity() != null ? tbl.getCapacity() : 0),
                tbl.getStatus() != null ? tbl.getStatus().name() : "-",
                tbl.getNote() != null ? tbl.getNote() : ""
            };
            doc.drawTableRow(row, tblWidths, (tblIdx++ % 2 == 1));
        }

        // 6. Menu Items Catalog
        doc.drawSectionTitle("6. MENU ITEMS CATALOG", "Complete restaurant food & beverage menu (" + menuItems.size() + ")");
        float[] miWidths = {165, 115, 75, 70, 90};
        doc.drawTableHeader(new String[]{"Item Name", "Category", "Price", "Status", "Description"}, miWidths);
        int miIdx = 0;
        for (MenuItem mi : menuItems) {
            String[] row = {
                mi.getName() != null ? mi.getName() : "-",
                mi.getCategory() != null ? mi.getCategory() : "-",
                "Rs. " + (mi.getPrice() != null ? mi.getPrice() : 0),
                mi.isActive() ? "ACTIVE" : "INACTIVE",
                mi.getDescription() != null ? mi.getDescription() : ""
            };
            doc.drawTableRow(row, miWidths, (miIdx++ % 2 == 1));
        }

        return doc.build();
    }

    /**
     * Returns the backup status and night schedule details for the given business.
     */
    public Map<String, Object> getBackupStatusForBusiness(Long businessId) {
        Business b = businessRepository.findById(businessId).orElse(null);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("schedule", "Daily at 11:00 PM (23:00 IST)");
        res.put("cron", "0 0 23 * * ?");
        res.put("hotelName", b != null ? b.getName() : "Hotel");
        res.put("contactEmail", b != null ? b.getContactEmail() : "");
        res.put("active", true);
        res.put("format", "Microsoft Excel (.xlsx) & PDF Document");

        String appYmlPassword = (defaultPassword != null) ? defaultPassword.replaceAll("\\s+", "").trim() : "";
        boolean configuredInYml = !appYmlPassword.isBlank();
        res.put("configuredInApplicationYml", configuredInYml);

        String activeSender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail.trim() : "omchaudhari553@gmail.com";
        res.put("sender", activeSender);
        res.put("hasCustomAppPassword", configuredInYml);

        return res;
    }

    /**
     * Saves custom SMTP sender and app password for a business.
     */
    @Transactional
    public void saveSmtpSettings(Long businessId, String senderEmail, String appPassword) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found with ID: " + businessId));
        if (senderEmail != null && !senderEmail.isBlank()) {
            saveSetting(business, "SMTP_SENDER_EMAIL", senderEmail.trim());
        }
        if (appPassword != null && !appPassword.isBlank()) {
            saveSetting(business, "SMTP_APP_PASSWORD", appPassword.replaceAll("\\s+", "").trim());
        }
    }

    @Transactional
    public void saveSetting(Business b, String key, String val) {
        HotelSetting s = hotelSettingRepository.findByBusinessIdAndCategoryAndSettingKey(b.getId(), "EMAIL_BACKUP", key)
                .orElse(null);
        if (s == null) {
            s = new HotelSetting();
            s.setBusiness(b);
            s.setCategory("EMAIL_BACKUP");
            s.setSettingKey(key);
        }
        s.setSettingValue(val);
        hotelSettingRepository.save(s);
    }

    /**
     * Builds the exact HTML email branded purely for the Hotel.
     */
    private String buildBackupEmailHtml(String hotelName, String backupDate, String refCode, String targetEmail) {
        String upperHotelName = hotelName.toUpperCase();
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Daily Business Data Backup - Microsoft Excel &amp; PDF</title>
            </head>
            <body style="margin: 0; padding: 24px 12px; background-color: #0E0F15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB; -webkit-font-smoothing: antialiased;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; margin: 0 auto; background-color: #171821; border-radius: 20px; border: 1px solid #262838; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);">
                
                <!-- Top Gradient Banner Header with Hotel Name -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1E3A8A 0%%, #2563EB 50%%, #4338CA 100%%); padding: 36px 24px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">%s</h1>
                    <p style="margin: 6px 0 0; color: #DBEAFE; font-size: 13px; font-weight: 500; letter-spacing: 0.3px;">Hotel POS &amp; Operations Management Suite</p>
                  </td>
                </tr>

                <!-- Main Content Area -->
                <tr>
                  <td style="padding: 28px 24px 20px;">
                    <h2 style="margin: 0 0 18px 0; color: #FFFFFF; font-size: 20px; font-weight: 800; line-height: 1.35;">
                      Daily Business Data Backup<br/>Completed Successfully
                    </h2>

                    <p style="margin: 0 0 14px 0; color: #D1D5DB; font-size: 14px; line-height: 1.5;">
                      Dear <strong style="color: #FFFFFF; font-weight: 700;">%s</strong>,
                    </p>

                    <p style="margin: 0 0 14px 0; color: #9CA3AF; font-size: 13.5px; line-height: 1.6;">
                      Your complete daily hotel data backup has been generated and is attached to this email as a multi-sheet <strong style="color: #22C55E;">Microsoft Excel workbook (.xlsx)</strong> and a comprehensive <strong style="color: #60A5FA;">PDF operations report (.pdf)</strong>.
                    </p>

                    <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 13.5px; line-height: 1.6;">
                      All sales invoices, guest orders, payments, expenses, dining tables, and restaurant menu items are organized in separate worksheets with full details and formatting. You can open and review these files on any <strong style="color: #FFFFFF;">phone</strong>, <strong style="color: #FFFFFF;">tablet</strong>, or <strong style="color: #FFFFFF;">computer</strong> using Excel, Google Sheets, or any PDF viewer.
                    </p>

                    <!-- Summary Table Card -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #1C1D27; border: 1px solid #282A3A; border-radius: 14px; margin: 0 0 20px 0; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636; width: 44%%;">Hotel / Company:</td>
                        <td style="padding: 11px 18px; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #242636;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636;">Attachments:</td>
                        <td style="padding: 11px 18px; color: #22C55E; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #242636;">Excel (.xlsx) &amp; PDF (.pdf)</td>
                      </tr>
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636;">Backup Date:</td>
                        <td style="padding: 11px 18px; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #242636;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636;">Status:</td>
                        <td style="padding: 11px 18px; color: #3B82F6; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; text-align: right; border-bottom: 1px solid #242636;">SUCCESS</td>
                      </tr>
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px;">Reference Code:</td>
                        <td style="padding: 11px 18px; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: right; letter-spacing: 0.5px;">%s</td>
                      </tr>
                    </table>

                    <!-- Support Help Box -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #1A1B25; border: 1px solid #282A3A; border-radius: 12px; margin: 0 0 24px 0;">
                      <tr>
                        <td style="padding: 14px 18px; text-align: center; color: #9CA3AF; font-size: 13px;">
                          Need assistance? Contact hotel management at <a href="mailto:%s" style="color: #60A5FA; text-decoration: none; font-weight: 600;">%s</a>.
                        </td>
                      </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="border-top: 1px solid #232536; padding-top: 18px; text-align: center;">
                      <tr>
                        <td style="text-align: center;">
                          <div style="color: #9CA3AF; font-size: 12px; font-weight: 600;">%s &bull; Hotel POS &amp; Management Suite</div>
                          <div style="color: #6B7280; font-size: 11px; margin-top: 4px;">&copy; 2026 %s. All rights reserved.</div>
                          <div style="color: #4B5563; font-size: 11px; margin-top: 4px;">Automated System Notification &bull; Daily Nightly Backup (11:00 PM)</div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(upperHotelName, hotelName, hotelName, backupDate, refCode, targetEmail, targetEmail, hotelName, hotelName);
    }

    /**
     * Pure Java multi-page PDF document builder producing ISO PDF 1.4 output
     * without any third-party dependencies.
     */
    static class PdfDocumentBuilder {
        private final String hotelName;
        private final String refCode;
        private final String backupDate;
        private final List<byte[]> pageStreams = new ArrayList<>();
        private StringBuilder currentStream;
        private float y = 790;
        private int pageNumber = 0;

        PdfDocumentBuilder(String hotelName, String refCode, String backupDate) {
            this.hotelName = hotelName;
            this.refCode = refCode;
            this.backupDate = backupDate;
            startNewPage();
        }

        void startNewPage() {
            if (pageNumber > 0) {
                closeCurrentPage();
            }
            pageNumber++;
            currentStream = new StringBuilder();
            if (pageNumber == 1) {
                // First Page Banner
                currentStream.append("q 0.12 0.23 0.54 rg 40 760 515 50 re f Q\n");
                currentStream.append("BT /F2 16 Tf 1 1 1 rg 55 788 Td (").append(escapePdf(hotelName.toUpperCase())).append(" - OPERATIONS BACKUP) Tj ET\n");
                currentStream.append("BT /F1 9 Tf 0.85 0.92 1 rg 55 772 Td (Hotel POS & Billing Management - Full Operations Report) Tj ET\n");
                currentStream.append("BT /F2 9 Tf 0.3 0.9 0.4 rg 450 788 Td (STATUS: SUCCESS) Tj ET\n");
                currentStream.append("BT /F1 8 Tf 0.85 0.92 1 rg 450 772 Td (Ref: ").append(escapePdf(refCode)).append(") Tj ET\n");
                y = 750;
            } else {
                // Header on subsequent pages
                currentStream.append("q 0.12 0.23 0.54 rg 40 805 515 22 re f Q\n");
                currentStream.append("BT /F2 9 Tf 1 1 1 rg 50 812 Td (").append(escapePdf(hotelName.toUpperCase())).append(" - Daily Operations Backup | Ref: ").append(escapePdf(refCode)).append(") Tj ET\n");
                currentStream.append("BT /F1 8 Tf 1 1 1 rg 500 812 Td (Page ").append(pageNumber).append(") Tj ET\n");
                y = 790;
            }
        }

        void closeCurrentPage() {
            // Footer at y = 30
            currentStream.append("q 0.85 0.85 0.85 RG 0.5 w 40 38 m 555 38 l S Q\n");
            currentStream.append("BT /F1 7.5 Tf 0.45 0.45 0.50 rg 40 26 Td (").append(escapePdf(hotelName)).append(" POS Management Suite - Automated Daily Backup Report) Tj ET\n");
            currentStream.append("BT /F2 7.5 Tf 0.45 0.45 0.50 rg 510 26 Td (Page ").append(pageNumber).append(") Tj ET\n");
            pageStreams.add(currentStream.toString().getBytes(StandardCharsets.ISO_8859_1));
        }

        void checkSpace(float requiredHeight) {
            if (y - requiredHeight < 55) {
                startNewPage();
            }
        }

        void drawExecutiveSummary(Business b, BigDecimal sales, BigDecimal expenses, int invCount, int ordCount, int payCount, int tblCount, int miCount) {
            checkSpace(135);
            // Hotel Details box
            currentStream.append("q 0.96 0.97 0.99 rg 40 680 515 65 re f Q\n");
            currentStream.append("q 0.80 0.85 0.92 RG 1 w 40 680 515 65 re S Q\n");
            currentStream.append("BT /F2 9 Tf 0.12 0.23 0.54 rg 50 730 Td (HOTEL PROFILE & BACKUP INFO) Tj ET\n");
            currentStream.append("BT /F1 8 Tf 0.25 0.30 0.40 rg 50 717 Td (Property: ").append(escapePdf(hotelName)).append(" | Code: ").append(escapePdf(b.getCode())).append(") Tj ET\n");
            currentStream.append("BT /F1 8 Tf 0.25 0.30 0.40 rg 50 704 Td (Email: ").append(escapePdf(b.getContactEmail())).append(" | Phone: ").append(escapePdf(b.getPhone())).append(") Tj ET\n");
            currentStream.append("BT /F1 8 Tf 0.25 0.30 0.40 rg 50 691 Td (Backup Date: ").append(escapePdf(backupDate)).append(" | Ref: ").append(escapePdf(refCode)).append(") Tj ET\n");

            // Key Metrics Grid
            currentStream.append("q 0.98 0.99 1 rg 310 685 240 55 re f Q\n");
            currentStream.append("q 0.85 0.88 0.95 RG 0.5 w 310 685 240 55 re S Q\n");
            currentStream.append("BT /F2 8 Tf 0.10 0.15 0.25 rg 320 725 Td (Total Sales: Rs. ").append(sales).append(") Tj ET\n");
            currentStream.append("BT /F2 8 Tf 0.10 0.15 0.25 rg 320 712 Td (Total Expenses: Rs. ").append(expenses).append(") Tj ET\n");
            currentStream.append("BT /F2 8 Tf 0.12 0.50 0.25 rg 320 699 Td (Net Balance: Rs. ").append(sales.subtract(expenses)).append(") Tj ET\n");
            currentStream.append("BT /F1 7.5 Tf 0.35 0.40 0.50 rg 440 725 Td (Invoices: ").append(invCount).append(") Tj ET\n");
            currentStream.append("BT /F1 7.5 Tf 0.35 0.40 0.50 rg 440 712 Td (Orders: ").append(ordCount).append(") Tj ET\n");
            currentStream.append("BT /F1 7.5 Tf 0.35 0.40 0.50 rg 440 699 Td (Tables: ").append(tblCount).append(" | Menu: ").append(miCount).append(") Tj ET\n");

            y = 665;
        }

        void drawSectionTitle(String title, String subtitle) {
            checkSpace(35);
            y -= 8;
            currentStream.append("BT /F2 11 Tf 0.08 0.18 0.45 rg 40 ").append(y).append(" Td (").append(escapePdf(title)).append(") Tj ET\n");
            if (subtitle != null && !subtitle.isEmpty()) {
                currentStream.append("BT /F1 8.5 Tf 0.40 0.45 0.55 rg 260 ").append(y).append(" Td (").append(escapePdf(subtitle)).append(") Tj ET\n");
            }
            y -= 4;
            currentStream.append("q 0.15 0.30 0.65 RG 1 w 40 ").append(y).append(" m 555 ").append(y).append(" l S Q\n");
            y -= 8;
        }

        void drawTableHeader(String[] headers, float[] colWidths) {
            checkSpace(22);
            currentStream.append("q 0.12 0.23 0.54 rg 40 ").append(y - 14).append(" 515 18 re f Q\n");
            float curX = 44;
            for (int i = 0; i < headers.length; i++) {
                float w = (colWidths != null && i < colWidths.length) ? colWidths[i] : 80;
                currentStream.append("BT /F2 8.5 Tf 1 1 1 rg ").append(curX).append(" ").append(y - 9).append(" Td (").append(escapePdf(headers[i])).append(") Tj ET\n");
                curX += w;
            }
            y -= 18;
        }

        void drawTableRow(String[] cells, float[] colWidths, boolean alternate) {
            checkSpace(18);
            if (alternate) {
                currentStream.append("q 0.96 0.97 0.98 rg 40 ").append(y - 12).append(" 515 16 re f Q\n");
            }
            currentStream.append("q 0.88 0.90 0.93 RG 0.5 w 40 ").append(y - 12).append(" m 555 ").append(y - 12).append(" l S Q\n");
            float curX = 44;
            for (int i = 0; i < cells.length; i++) {
                float w = (colWidths != null && i < colWidths.length) ? colWidths[i] : 80;
                String txt = (cells[i] != null) ? cells[i] : "";
                int maxChars = Math.max(5, (int)(w / 5.2f));
                if (txt.length() > maxChars) {
                    txt = txt.substring(0, maxChars - 2) + "..";
                }
                currentStream.append("BT /F1 8 Tf 0.15 0.18 0.22 rg ").append(curX).append(" ").append(y - 8).append(" Td (").append(escapePdf(txt)).append(") Tj ET\n");
                curX += w;
            }
            y -= 16;
        }

        byte[] build() {
            closeCurrentPage();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.ISO_8859_1));
            pw.print("%PDF-1.4\n");
            pw.flush();

            List<Integer> offsets = new ArrayList<>();
            offsets.add(0);

            // Obj 1: Catalog
            offsets.add(out.size());
            pw.print("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
            pw.flush();

            // Obj 2: Pages
            offsets.add(out.size());
            StringBuilder kids = new StringBuilder();
            for (int i = 1; i <= pageNumber; i++) kids.append((i + 2)).append(" 0 R ");
            pw.print("2 0 obj\n<< /Type /Pages /Kids [" + kids.toString().trim() + "] /Count " + pageNumber + " >>\nendobj\n");
            pw.flush();

            int f1 = 2 + pageNumber + 1;
            int f2 = 2 + pageNumber + 2;
            int firstStream = 2 + pageNumber + 3;

            for (int i = 1; i <= pageNumber; i++) {
                offsets.add(out.size());
                int stObj = firstStream + (i - 1);
                pw.print((i + 2) + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " +
                         f1 + " 0 R /F2 " + f2 + " 0 R >> >> /Contents " + stObj + " 0 R >>\nendobj\n");
                pw.flush();
            }

            // Fonts
            offsets.add(out.size());
            pw.print(f1 + " 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
            pw.flush();

            offsets.add(out.size());
            pw.print(f2 + " 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");
            pw.flush();

            // Page Streams
            for (int i = 1; i <= pageNumber; i++) {
                offsets.add(out.size());
                byte[] sBytes = pageStreams.get(i - 1);
                int stObj = firstStream + (i - 1);
                pw.print(stObj + " 0 obj\n<< /Length " + sBytes.length + " >>\nstream\n");
                pw.flush();
                try {
                    out.write(sBytes);
                } catch (Exception ignored) {}
                pw.print("\nendstream\nendobj\n");
                pw.flush();
            }

            int totalObjs = offsets.size() - 1;
            int startXref = out.size();
            pw.print("xref\n0 " + (totalObjs + 1) + "\n0000000000 65535 f \n");
            for (int i = 1; i <= totalObjs; i++) {
                pw.printf(Locale.US, "%010d 00000 n \n", offsets.get(i));
            }
            pw.print("trailer\n<< /Size " + (totalObjs + 1) + " /Root 1 0 R >>\nstartxref\n" + startXref + "\n%%EOF\n");
            pw.flush();
            return out.toByteArray();
        }

        static String escapePdf(String s) {
            if (s == null) return "";
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c == '\\' || c == '(' || c == ')') sb.append('\\').append(c);
                else if (c == 0x20B9) sb.append("Rs. ");
                else if (c >= 32 && c <= 126) sb.append(c);
                else sb.append('?');
            }
            return sb.toString();
        }
    }
}
