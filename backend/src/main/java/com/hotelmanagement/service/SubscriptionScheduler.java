package com.hotelmanagement.service;

import com.hotelmanagement.entity.BusinessSubscription;
import com.hotelmanagement.enums.SubscriptionStatus;
import com.hotelmanagement.repository.BusinessSubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class SubscriptionScheduler {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionScheduler.class);

    private final BusinessSubscriptionRepository subscriptionRepo;
    private final SubscriptionService subscriptionService;

    public SubscriptionScheduler(BusinessSubscriptionRepository subscriptionRepo,
                                 SubscriptionService subscriptionService) {
        this.subscriptionRepo = subscriptionRepo;
        this.subscriptionService = subscriptionService;
    }

    /**
     * Run on application startup and hourly to enforce server-side expiration
     * and trigger proactive reminders.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 0 * * * *") // Every hour at minute 0
    public void runSubscriptionChecks() {
        log.info("Running scheduled subscription validity and expiry checks...");
        try {
            processSubscriptions();
        } catch (Exception e) {
            log.warn("Subscription check failed: {}", e.getMessage());
        }
    }

    private void processSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        List<BusinessSubscription> activeSubs = subscriptionRepo.findAll();

        for (BusinessSubscription sub : activeSubs) {
            try {
                if (sub.getBusiness() != null) {
                    subscriptionService.getSubscriptionForBusiness(sub.getBusiness().getId());
                }
            } catch (Exception ex) {
                log.warn("Error checking subscription id [{}]: {}", sub.getId(), ex.getMessage());
            }
        }
    }
}
