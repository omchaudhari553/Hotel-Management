package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaasPaymentRepository extends JpaRepository<SaasPayment, Long> {

    List<SaasPayment> findAllByBusinessId(Long businessId);

    List<SaasPayment> findAllByBranchId(Long branchId);

    List<SaasPayment> findAllByStatusIgnoreCase(String status);

    long countByStatusIgnoreCase(String status);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM SaasPayment p WHERE p.status = 'SUCCESS'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM SaasPayment p WHERE p.status = 'SUCCESS' AND p.createdAt >= :since")
    BigDecimal sumRevenueSince(@Param("since") LocalDateTime since);

    @Query("SELECT p FROM SaasPayment p WHERE p.status = 'SUCCESS' AND p.createdAt >= :since ORDER BY p.createdAt DESC")
    List<SaasPayment> findSuccessfulPaymentsSince(@Param("since") LocalDateTime since);
}
