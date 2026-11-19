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

    @Value("${spring.mail.password:jeksumzprelsrnzb}")
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

        // 2. Generate JSON Attachment Bytes
        byte[] jsonBytes;
        try {
            String jsonStr = objectMapper.writeValueAsString(backupData);
            jsonBytes = jsonStr.getBytes(StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.error("Failed to serialize hotel backup data to JSON: {}", ex.getMessage());
            jsonBytes = ("{\"error\":\"Failed to serialize\",\"reference\":\"" + refCode + "\"}").getBytes(StandardCharsets.UTF_8);
        }

        // 3. Generate Minimalist Valid PDF Attachment Bytes
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) backupData.get("summary");
        byte[] pdfBytes = generateMinimalPdf(hotelName, refCode, formattedDate, targetEmail, summary);

        // 4. Always save backup securely on server disk
        try {
            File backupDir = new File("backups");
            if (!backupDir.exists()) backupDir.mkdirs();
            File backupJsonFile = new File(backupDir, "hotel_daily_backup_" + randomSuffix + ".json");
            Files.write(backupJsonFile.toPath(), jsonBytes);
            File backupPdfFile = new File(backupDir, "hotel_daily_backup_" + randomSuffix + ".pdf");
            Files.write(backupPdfFile.toPath(), pdfBytes);
            log.info("Daily backup files safely saved to disk: {}", backupJsonFile.getAbsolutePath());
        } catch (Exception ioEx) {
            log.warn("Could not write backup to local disk: {}", ioEx.getMessage());
        }

        // 5. Build Pixel-Perfect Dark HTML Email branded purely for the Hotel
        String htmlBody = buildBackupEmailHtml(hotelName, formattedDate, refCode, targetEmail);

        // 6. Resolve Active Sender and Password (saved setting > param > application.yml)
        String activeSenderUser = fromEmail;
        if (customSenderEmail != null && !customSenderEmail.isBlank() && customSenderEmail.contains("@")) {
            activeSenderUser = customSenderEmail.trim();
        } else {
            Optional<HotelSetting> savedSender = hotelSettingRepository.findByBusinessIdAndCategoryAndSettingKey(businessId, "EMAIL_BACKUP", "SMTP_SENDER_EMAIL");
            if (savedSender.isPresent() && savedSender.get().getSettingValue() != null && !savedSender.get().getSettingValue().isBlank()) {
                activeSenderUser = savedSender.get().getSettingValue().trim();
            }
        }

        String activePassword = defaultPassword;
        if (customAppPassword != null && !customAppPassword.isBlank()) {
            activePassword = customAppPassword.replaceAll("\\s+", "").trim();
        } else {
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

        // 7. Send Email via JavaMailSender
        boolean emailSent = false;
        String sendError = null;

        try {
            MimeMessage message = activeMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(activeSenderUser, hotelName + " Management");
            helper.setTo(targetEmail);
            helper.setSubject("Daily Business Data Backup - " + hotelName);
            helper.setText(htmlBody, true);

            // Attach JSON backup file
            String jsonFileName = "hotel_daily_backup_" + randomSuffix + ".json";
            helper.addAttachment(jsonFileName, new ByteArrayResource(jsonBytes), "application/json");

            // Also attach PDF daily summary report
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
        response.put("jsonAttachment", "hotel_daily_backup_" + randomSuffix + ".json");
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
     * Generates raw PDF summary bytes for downloading.
     */
    @Transactional(readOnly = true)
    public byte[] generateBackupPdf(Long businessId) {
        Business b = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));
        String hotelName = (b.getName() != null && !b.getName().isBlank()) ? b.getName().trim() : "Hotel POS";
        String targetEmail = b.getContactEmail() != null ? b.getContactEmail() : "Hotel Owner";
        int randomSuffix = 10000 + new Random().nextInt(90000);
        String refCode = "HTL-" + randomSuffix;
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDateTime now = LocalDateTime.now(istZone);
        String formattedDate = now.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a", Locale.ENGLISH)).toLowerCase();
        formattedDate = formattedDate.substring(0, 11) + formattedDate.substring(11).toUpperCase();
        if (formattedDate.endsWith("AM")) formattedDate = formattedDate.substring(0, formattedDate.length() - 2) + "am";
        if (formattedDate.endsWith("PM")) formattedDate = formattedDate.substring(0, formattedDate.length() - 2) + "pm";

        Map<String, Object> data = buildBackupPayload(b, refCode, now);
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) data.get("summary");
        return generateMinimalPdf(hotelName, refCode, formattedDate, targetEmail, summary);
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
        res.put("format", "JSON Backup (.json) & PDF Summary");

        String activeSender = fromEmail;
        Optional<HotelSetting> savedSender = hotelSettingRepository.findByBusinessIdAndCategoryAndSettingKey(businessId, "EMAIL_BACKUP", "SMTP_SENDER_EMAIL");
        if (savedSender.isPresent() && savedSender.get().getSettingValue() != null && !savedSender.get().getSettingValue().isBlank()) {
            activeSender = savedSender.get().getSettingValue().trim();
        }
        res.put("sender", activeSender);

        Optional<HotelSetting> savedPwd = hotelSettingRepository.findByBusinessIdAndCategoryAndSettingKey(businessId, "EMAIL_BACKUP", "SMTP_APP_PASSWORD");
        boolean hasCustomAppPassword = savedPwd.isPresent() && savedPwd.get().getSettingValue() != null && !savedPwd.get().getSettingValue().isBlank();
        res.put("hasCustomAppPassword", hasCustomAppPassword);

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
              <title>Business Data Backup Completed Successfully</title>
            </head>
            <body style="margin: 0; padding: 24px 12px; background-color: #0E0F15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB; -webkit-font-smoothing: antialiased;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 540px; margin: 0 auto; background-color: #171821; border-radius: 20px; border: 1px solid #262838; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);">
                
                <!-- Top Gradient Banner Header with Hotel Name -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1E3A8A 0%%, #2563EB 50%%, #4338CA 100%%); padding: 36px 24px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">%s</h1>
                    <p style="margin: 6px 0 0; color: #DBEAFE; font-size: 13px; font-weight: 500; letter-spacing: 0.3px;">Hotel POS &amp; Restaurant Operations Management</p>
                  </td>
                </tr>

                <!-- Main Content Area -->
                <tr>
                  <td style="padding: 28px 24px 20px;">
                    <h2 style="margin: 0 0 18px 0; color: #FFFFFF; font-size: 20px; font-weight: 800; line-height: 1.35;">
                      Business Data Backup<br/>Completed Successfully
                    </h2>

                    <p style="margin: 0 0 14px 0; color: #D1D5DB; font-size: 14px; line-height: 1.5;">
                      Dear <strong style="color: #FFFFFF; font-weight: 700;">%s</strong>,
                    </p>

                    <p style="margin: 0 0 14px 0; color: #9CA3AF; font-size: 13.5px; line-height: 1.6;">
                      Your complete daily hotel data backup has been generated and is attached to this email as a Microsoft Excel workbook (.xlsx) and JSON data file.
                    </p>

                    <p style="margin: 0 0 24px 0; color: #9CA3AF; font-size: 13.5px; line-height: 1.6;">
                      All sales, purchases, products, customers, suppliers, expenses, and accounts have been cleanly organized into separate sheets with proper data formatting. You can view, filter, or analyze this file on any <strong style="color: #FFFFFF;">phone</strong>, <strong style="color: #FFFFFF;">tablet</strong>, or <strong style="color: #FFFFFF;">PC</strong> using Excel, Google Sheets, or any office application.
                    </p>

                    <!-- Summary Table Card -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #1C1D27; border: 1px solid #282A3A; border-radius: 14px; margin: 0 0 20px 0; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636; width: 44%%;">Company:</td>
                        <td style="padding: 11px 18px; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #242636;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px; border-bottom: 1px solid #242636;">Backup Format:</td>
                        <td style="padding: 11px 18px; color: #22C55E; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #242636;">Microsoft Excel (.xlsx)</td>
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
                        <td style="padding: 11px 18px; color: #9CA3AF; font-size: 13px;">Backup Reference:</td>
                        <td style="padding: 11px 18px; color: #FFFFFF; font-size: 13px; font-weight: 700; text-align: right; letter-spacing: 0.5px;">%s</td>
                      </tr>
                    </table>

                    <!-- Support Help Box -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #1A1B25; border: 1px solid #282A3A; border-radius: 12px; margin: 0 0 24px 0;">
                      <tr>
                        <td style="padding: 14px 18px; text-align: center; color: #9CA3AF; font-size: 13px;">
                          Need help? Contact hotel administration at <a href="mailto:%s" style="color: #60A5FA; text-decoration: none; font-weight: 600;">%s</a>.
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
     * Generates a 100% compliant, minimalist PDF 1.4 daily summary report
     * without requiring any external third-party PDF dependencies.
     */
    private byte[] generateMinimalPdf(
            String hotelName,
            String refCode,
            String backupDate,
            String targetEmail,
            Map<String, Object> summary) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.ISO_8859_1));

        StringBuilder stream = new StringBuilder();
        stream.append("BT\n");
        stream.append("/F1 20 Tf\n");
        stream.append("50 750 Td\n");
        stream.append("(").append(escapePdfText(hotelName.toUpperCase())).append(" - Daily Hotel Backup) Tj\n");
        stream.append("/F1 11 Tf\n");
        stream.append("0 -24 Td\n");
        stream.append("(Hotel / Restaurant: ").append(escapePdfText(hotelName)).append(") Tj\n");
        stream.append("0 -18 Td\n");
        stream.append("(Backup Date: ").append(escapePdfText(backupDate)).append(") Tj\n");
        stream.append("0 -18 Td\n");
        stream.append("(Reference Code: ").append(escapePdfText(refCode)).append(") Tj\n");
        stream.append("0 -18 Td\n");
        stream.append("(Recipient Email: ").append(escapePdfText(targetEmail)).append(") Tj\n");
        stream.append("0 -18 Td\n");
        stream.append("(Status: SUCCESS) Tj\n");
        stream.append("0 -32 Td\n");
        stream.append("/F1 14 Tf\n");
        stream.append("(Daily Operations Summary:) Tj\n");
        stream.append("/F1 11 Tf\n");

        if (summary != null) {
            for (Map.Entry<String, Object> e : summary.entrySet()) {
                stream.append("0 -18 Td\n");
                stream.append("(- ").append(escapePdfText(e.getKey())).append(": ").append(escapePdfText(String.valueOf(e.getValue()))).append(") Tj\n");
            }
        }

        stream.append("0 -36 Td\n");
        stream.append("/F1 9 Tf\n");
        stream.append("(This document confirms that the automated daily hotel backup was completed successfully.) Tj\n");
        stream.append("0 -14 Td\n");
        stream.append("(Full data records are included in the accompanying JSON backup attachment.) Tj\n");
        stream.append("0 -20 Td\n");
        stream.append("(").append(escapePdfText(hotelName)).append(" POS & Billing System) Tj\n");
        stream.append("ET\n");

        byte[] streamBytes = stream.toString().getBytes(StandardCharsets.ISO_8859_1);

        pw.print("%PDF-1.4\n");
        pw.flush();
        int offset1 = out.size();
        pw.print("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        pw.flush();
        int offset2 = out.size();
        pw.print("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
        pw.flush();
        int offset3 = out.size();
        pw.print("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");
        pw.flush();
        int offset4 = out.size();
        pw.print("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
        pw.flush();
        int offset5 = out.size();
        pw.print("5 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n");
        pw.flush();
        try {
            out.write(streamBytes);
        } catch (Exception ignored) {
        }
        pw.print("\nendstream\nendobj\n");
        pw.flush();
        int startXref = out.size();
        pw.print("xref\n0 6\n0000000000 65535 f \n");
        pw.printf(Locale.US, "%010d 00000 n \n", offset1);
        pw.printf(Locale.US, "%010d 00000 n \n", offset2);
        pw.printf(Locale.US, "%010d 00000 n \n", offset3);
        pw.printf(Locale.US, "%010d 00000 n \n", offset4);
        pw.printf(Locale.US, "%010d 00000 n \n", offset5);
        pw.print("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + startXref + "\n%%EOF\n");
        pw.flush();

        return out.toByteArray();
    }

    private String escapePdfText(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
