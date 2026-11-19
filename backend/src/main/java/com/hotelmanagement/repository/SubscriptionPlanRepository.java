package com.hotelmanagement.repository;

import com.hotelmanagement.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    Optional<SubscriptionPlan> findByPlanCode(String planCode);
    List<SubscriptionPlan> findAllByIsActiveTrue();
    List<SubscriptionPlan> findAllByIndustryCodeAndIsActiveTrue(String industryCode);
}
