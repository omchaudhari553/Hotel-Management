package com.hotelmanagement.repository;
import com.hotelmanagement.entity.PurchaseInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice,Long> {
    List<PurchaseInvoice> findAllByBusinessId(Long businessId);
    Optional<PurchaseInvoice> findByIdAndBusinessId(Long id,Long businessId);
}
