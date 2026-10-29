package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface BranchRepository extends JpaRepository<Branch,Long> {
    Optional<Branch> findByIdAndBusinessId(Long id, Long businessId);
    List<Branch> findAllByBusinessId(Long businessId);
}
