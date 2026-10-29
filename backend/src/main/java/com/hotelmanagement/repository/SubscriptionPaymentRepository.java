package com.hotelmanagement.repository;

import com.hotelmanagement.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {
    Optional<SubscriptionPayment> findByOrderId(String orderId);
    Optional<SubscriptionPayment> findByPaymentId(String paymentId);

    @Query("SELECT p FROM SubscriptionPayment p WHERE p.business.id = :businessId ORDER BY p.createdAt DESC")
    List<SubscriptionPayment> findAllByBusinessId(@Param("businessId") Long businessId);
}
