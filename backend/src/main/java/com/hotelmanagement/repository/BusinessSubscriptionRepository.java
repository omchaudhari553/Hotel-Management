package com.hotelmanagement.repository;

import com.hotelmanagement.entity.BusinessSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BusinessSubscriptionRepository extends JpaRepository<BusinessSubscription, Long> {
    @Query("SELECT s FROM BusinessSubscription s WHERE s.business.id = :businessId ORDER BY s.id DESC")
    List<BusinessSubscription> findAllByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT s FROM BusinessSubscription s WHERE s.business.id = :businessId AND s.status IN ('TRIAL_ACTIVE', 'ACTIVE') ORDER BY s.id DESC")
    Optional<BusinessSubscription> findActiveByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT s FROM BusinessSubscription s WHERE s.status IN ('TRIAL_ACTIVE', 'ACTIVE') AND s.endDate < :now")
    List<BusinessSubscription> findAllExpiredSubscriptions(@Param("now") LocalDateTime now);

    @Query("SELECT s FROM BusinessSubscription s WHERE s.status IN ('TRIAL_ACTIVE', 'ACTIVE') AND s.endDate BETWEEN :from AND :to")
    List<BusinessSubscription> findAllSubscriptionsExpiringBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
