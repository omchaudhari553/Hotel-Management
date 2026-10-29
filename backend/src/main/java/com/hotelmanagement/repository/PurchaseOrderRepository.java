package com.hotelmanagement.repository;
import com.hotelmanagement.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,Long> {
    List<PurchaseOrder> findAllByBusinessId(Long businessId);
    Optional<PurchaseOrder> findByIdAndBusinessId(Long id,Long businessId);
}
