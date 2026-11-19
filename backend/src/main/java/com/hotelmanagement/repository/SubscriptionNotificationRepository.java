package com.hotelmanagement.repository;

import com.hotelmanagement.entity.SubscriptionNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SubscriptionNotificationRepository extends JpaRepository<SubscriptionNotification, Long> {

    @Query("SELECT n FROM SubscriptionNotification n WHERE n.business.id = :businessId ORDER BY n.createdAt DESC")
    List<SubscriptionNotification> findAllByBusinessId(@Param("businessId") Long businessId);
}

