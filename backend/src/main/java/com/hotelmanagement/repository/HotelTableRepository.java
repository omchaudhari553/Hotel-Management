package com.hotelmanagement.repository;

import com.hotelmanagement.entity.HotelTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface HotelTableRepository extends JpaRepository<HotelTable, Long> {
    List<HotelTable> findAllByBusinessId(Long businessId);
    List<HotelTable> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    long countByBusinessId(Long businessId);
    long countByBusinessIdAndBranchId(Long businessId, Long branchId);
    Optional<HotelTable> findByIdAndBusinessId(Long id, Long businessId);
    Optional<HotelTable> findByIdAndBusinessIdAndBranchId(Long id, Long businessId, Long branchId);
    boolean existsByBranchIdAndName(Long branchId, String name);
}
