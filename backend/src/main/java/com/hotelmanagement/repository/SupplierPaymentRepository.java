package com.hotelmanagement.repository;
import com.hotelmanagement.entity.SupplierPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment,Long> {
    List<SupplierPayment> findAllByBusinessId(Long businessId);
}
