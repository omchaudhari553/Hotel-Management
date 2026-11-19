package com.hotelmanagement.repository;

import com.hotelmanagement.entity.PurchaseReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, Long> {
    List<PurchaseReturn> findAllByBusinessId(Long businessId);
    Optional<PurchaseReturn> findByIdAndBusinessId(Long id, Long businessId);
    List<PurchaseReturn> findAllByBusinessIdAndSupplierId(Long businessId, Long supplierId);
    Optional<PurchaseReturn> findByBusinessIdAndReturnNumber(Long businessId, String returnNumber);
}
