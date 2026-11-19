package com.hotelmanagement.repository;

import com.hotelmanagement.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    Optional<SubscriptionPayment> findByOrderId(String orderId);

    Optional<SubscriptionPayment> findByOrderRef(String orderRef);

    Optional<SubscriptionPayment> findByPaymentId(String paymentId);

    @Query("SELECT p FROM SubscriptionPayment p WHERE p.business.id = :businessId ORDER BY p.createdAt DESC")
    List<SubscriptionPayment> findAllByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT p FROM SubscriptionPayment p ORDER BY p.createdAt DESC")
    List<SubscriptionPayment> findAllOrdered();

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM SubscriptionPayment p WHERE p.status = 'SUCCESS'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COUNT(p) FROM SubscriptionPayment p WHERE p.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT p FROM SubscriptionPayment p WHERE p.status = 'SUCCESS' AND p.paidAt >= :since ORDER BY p.paidAt DESC")
    List<SubscriptionPayment> findSuccessfulPaymentsSince(@Param("since") LocalDateTime since);
}
