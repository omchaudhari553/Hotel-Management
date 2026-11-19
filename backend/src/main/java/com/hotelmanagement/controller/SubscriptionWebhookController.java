package com.hotelmanagement.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelmanagement.dto.SubscriptionDtos.VerifyPaymentRequest;
import com.hotelmanagement.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/webhooks/subscription")
@Tag(name = "Subscription Webhooks", description = "Payment Gateway Webhook Handling")
public class SubscriptionWebhookController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionWebhookController.class);

    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper;

    @Value("${app.razorpay.webhook-secret:}")
    private String webhookSecret;

    public SubscriptionWebhookController(SubscriptionService subscriptionService, ObjectMapper objectMapper) {
        this.subscriptionService = subscriptionService;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    @Operation(summary = "Handle payment gateway webhook callback")
    public ResponseEntity<?> handleWebhook(@RequestBody String rawPayload,
                                           @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        try {
            // If webhook secret configured, verify signature
            if (webhookSecret != null && !webhookSecret.isBlank() && signature != null) {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] hash = mac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
                StringBuilder hex = new StringBuilder();
                for (byte b : hash) hex.append(String.format("%02x", b));
                if (!MessageDigest.isEqual(hex.toString().getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8))) {
                    log.warn("Invalid webhook signature received");
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid signature"));
                }
            }

            JsonNode node = objectMapper.readTree(rawPayload);
            String event = node.path("event").asText("");
            log.info("Subscription webhook event received: [{}]", event);

            if ("payment.captured".equalsIgnoreCase(event) || "order.paid".equalsIgnoreCase(event)) {
                JsonNode paymentEntity = node.path("payload").path("payment").path("entity");
                String orderId = paymentEntity.path("order_id").asText();
                String paymentId = paymentEntity.path("id").asText();
                String method = paymentEntity.path("method").asText("RAZORPAY");

                if (!orderId.isBlank() && !paymentId.isBlank()) {
                    VerifyPaymentRequest req = new VerifyPaymentRequest(orderId, paymentId, signature, method);
                    subscriptionService.verifyPayment(req);
                    log.info("Subscription successfully processed via webhook for order [{}]", orderId);
                }
            }

            return ResponseEntity.ok(Map.of("status", "received"));
        } catch (Exception e) {
            log.error("Webhook processing failed: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("status", "ignored", "error", e.getMessage()));
        }
    }
}
