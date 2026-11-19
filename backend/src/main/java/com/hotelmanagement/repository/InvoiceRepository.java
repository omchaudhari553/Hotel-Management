package com.hotelmanagement.repository;

import com.hotelmanagement.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;
import java.time.LocalDate;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findAllByBusinessId(Long businessId);
    List<Invoice> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    long countByBusinessId(Long businessId);
    long countByBusinessIdAndBranchId(Long businessId, Long branchId);
    Optional<Invoice> findByIdAndBusinessId(Long id, Long businessId);
    Optional<Invoice> findByIdAndBusinessIdAndBranchId(Long id, Long businessId, Long branchId);
    Optional<Invoice> findFirstByOrderIdAndBusinessId(Long orderId, Long businessId);
    Optional<Invoice> findFirstByOrderId(Long orderId);
    List<Invoice> findAllByBusinessIdAndInvoiceDateBetween(Long businessId, LocalDate start, LocalDate end);
    List<Invoice> findAllByBusinessIdAndBranchIdAndInvoiceDateBetween(Long businessId, Long branchId, LocalDate start, LocalDate end);
    Optional<Invoice> findFirstByBusinessIdAndInvoiceNumber(Long businessId, String invoiceNumber);
}
