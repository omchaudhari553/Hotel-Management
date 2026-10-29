package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Kot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface KotRepository extends JpaRepository<Kot,Long> {
    List<Kot> findAllByBusinessId(Long businessId);
    List<Kot> findAllByBusinessIdOrderByCreatedAtDesc(Long businessId);
    List<Kot> findAllByBusinessIdAndBranchIdOrderByCreatedAtDesc(Long businessId, Long branchId);
    List<Kot> findAllByOrderId(Long orderId);
    Optional<Kot> findByIdAndBusinessId(Long id,Long businessId);
    long countByBusinessId(Long businessId);
}
