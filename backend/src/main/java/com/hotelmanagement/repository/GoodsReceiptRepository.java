package com.hotelmanagement.repository;

import com.hotelmanagement.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findAllByBusinessId(Long businessId);
    Optional<GoodsReceipt> findByIdAndBusinessId(Long id, Long businessId);
    List<GoodsReceipt> findAllByBusinessIdAndSupplierId(Long businessId, Long supplierId);
    Optional<GoodsReceipt> findByBusinessIdAndGrnNumber(Long businessId, String grnNumber);
}
