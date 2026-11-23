package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasSubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaasSubscriptionPlanRepository extends JpaRepository<SaasSubscriptionPlan, Long> {
    List<SaasSubscriptionPlan> findAllByProductId(Long productId);
    List<SaasSubscriptionPlan> findAllByProductCodeIgnoreCase(String productCode);
    Optional<SaasSubscriptionPlan> findByCodeIgnoreCase(String code);
}
