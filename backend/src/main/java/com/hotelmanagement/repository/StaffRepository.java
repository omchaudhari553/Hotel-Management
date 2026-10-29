package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface StaffRepository extends JpaRepository<Staff,Long> {
    List<Staff> findAllByBusinessId(Long businessId);
    List<Staff> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    long countByBusinessId(Long businessId);
    long countByBusinessIdAndBranchId(Long businessId, Long branchId);
    Optional<Staff> findByIdAndBusinessId(Long id,Long businessId);
}
