package com.hotelmanagement.repository;

import com.hotelmanagement.entity.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;
import java.time.LocalDate;

@Repository 
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @EntityGraph(attributePaths = {"invoice"})
    List<Payment> findAllByBusinessId(Long businessId);

    @EntityGraph(attributePaths = {"invoice"})
    List<Payment> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);

    long countByBusinessId(Long businessId);
    long countByBusinessIdAndBranchId(Long businessId, Long branchId);

    @EntityGraph(attributePaths = {"invoice"})
    Optional<Payment> findByIdAndBusinessId(Long id, Long businessId);

    @EntityGraph(attributePaths = {"invoice"})
    Optional<Payment> findByIdAndBusinessIdAndBranchId(Long id, Long businessId, Long branchId);

    boolean existsByTransactionRef(String transactionRef);
    Optional<Payment> findFirstByTransactionRef(String transactionRef);
    List<Payment> findAllByInvoiceId(Long invoiceId);
    List<Payment> findAllByBusinessIdAndPaymentDateBetween(Long businessId, LocalDate start, LocalDate end);
    List<Payment> findAllByBusinessIdAndBranchIdAndPaymentDateBetween(Long businessId, Long branchId, LocalDate start, LocalDate end);
}
