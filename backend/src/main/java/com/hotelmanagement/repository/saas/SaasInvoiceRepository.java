package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaasInvoiceRepository extends JpaRepository<SaasInvoice, Long> {
    Optional<SaasInvoice> findByInvoiceNumber(String invoiceNumber);
    List<SaasInvoice> findAllByBusinessId(Long businessId);
    List<SaasInvoice> findAllByBranchId(Long branchId);
}
