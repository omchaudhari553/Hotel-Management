package com.hotelmanagement.repository;
import com.hotelmanagement.entity.HotelTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface HotelTableRepository extends JpaRepository<HotelTable,Long> {
    List<HotelTable> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    Optional<HotelTable> findByIdAndBusinessId(Long id,Long businessId);
    boolean existsByBranchIdAndName(Long branchId,String name);
}
