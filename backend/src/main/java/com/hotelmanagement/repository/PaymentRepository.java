package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Payment;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository 
public interface PaymentRepository extends JpaRepository<Payment,Long> {
    @EntityGraph(attributePaths= {
        "invoice"
    }
    ) List<Payment> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    @EntityGraph(attributePaths= {
        "invoice"
    }
    ) Optional<Payment> findByIdAndBusinessId(Long id,Long businessId);
    boolean existsByTransactionRef(String transactionRef);
    Optional<Payment> findFirstByTransactionRef(String transactionRef);
    List<Payment> findAllByInvoiceId(Long invoiceId);
}
