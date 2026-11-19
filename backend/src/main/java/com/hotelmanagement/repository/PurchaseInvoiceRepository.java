package com.hotelmanagement.repository;

import com.hotelmanagement.entity.PurchaseInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;
import java.time.LocalDate;

@Repository
public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long> {
    List<PurchaseInvoice> findAllByBusinessId(Long businessId);
    List<PurchaseInvoice> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    Optional<PurchaseInvoice> findByIdAndBusinessId(Long id, Long businessId);
    Optional<PurchaseInvoice> findByIdAndBusinessIdAndBranchId(Long id, Long businessId, Long branchId);
    List<PurchaseInvoice> findAllByBusinessIdAndInvoiceDateBetween(Long businessId, LocalDate start, LocalDate end);
    List<PurchaseInvoice> findAllByBusinessIdAndBranchIdAndInvoiceDateBetween(Long businessId, Long branchId, LocalDate start, LocalDate end);
}
