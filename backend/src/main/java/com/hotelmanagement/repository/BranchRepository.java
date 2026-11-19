package com.hotelmanagement.repository;

import com.hotelmanagement.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByIdAndBusinessId(Long id, Long businessId);
    List<Branch> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    long countByBusinessIdAndStatus(Long businessId, String status);
    boolean existsByBusinessIdAndNameIgnoreCase(Long businessId, String name);
    boolean existsByBusinessIdAndCode(Long businessId, String code);
    Optional<Branch> findFirstByBusinessIdOrderByIdAsc(Long businessId);
}
