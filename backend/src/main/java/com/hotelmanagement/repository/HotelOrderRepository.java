package com.hotelmanagement.repository;

import com.hotelmanagement.entity.HotelOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface HotelOrderRepository extends JpaRepository<HotelOrder, Long> {
    List<HotelOrder> findAllByBusinessId(Long businessId);
    List<HotelOrder> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    long countByBusinessId(Long businessId);
    long countByBusinessIdAndBranchId(Long businessId, Long branchId);
    Optional<HotelOrder> findByIdAndBusinessId(Long id, Long businessId);
    Optional<HotelOrder> findByIdAndBusinessIdAndBranchId(Long id, Long businessId, Long branchId);
    boolean existsByTableIdAndStatusIn(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
    List<HotelOrder> findByTableIdAndStatusIn(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
    Optional<HotelOrder> findFirstByTableIdAndStatusInOrderByIdDesc(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
}
