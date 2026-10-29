package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface InvoiceRepository extends JpaRepository<Invoice,Long> {
    List<Invoice> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    Optional<Invoice> findByIdAndBusinessId(Long id,Long businessId);
    Optional<Invoice> findFirstByOrderIdAndBusinessId(Long orderId, Long businessId);
    Optional<Invoice> findFirstByOrderId(Long orderId);
}
